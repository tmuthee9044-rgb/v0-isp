import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = getSql()
    const {
      acct_status_type,
      acct_session_id,
      acct_unique_id,
      username,
      nas_ip_address,
      nas_port_id,
      service_type,
      framed_ip_address,
      calling_station_id,
      called_station_id,
      acct_session_time = 0,
      acct_input_octets = 0,
      acct_output_octets = 0,
      acct_input_packets = 0,
      acct_output_packets = 0,
      acct_terminate_cause,
    } = await request.json()

    console.log("[v0] RADIUS Accounting:", acct_status_type, "for", username, "session:", acct_session_id)

    // Get NAS
    const nas = await sql`
      SELECT id FROM radius_nas 
      WHERE ip_address = ${nas_ip_address}
      LIMIT 1
    `

    if (nas.length === 0) {
      return NextResponse.json({ error: "NAS not found" }, { status: 404 })
    }

    // Get user
    const users = await sql`
      SELECT id FROM radius_users 
      WHERE username = ${username}
      LIMIT 1
    `

    const user_id = users.length > 0 ? users[0].id : null

    // Handle different accounting status types
    switch (acct_status_type) {
      case "Start":
        // Create active session
        await sql`
          INSERT INTO radius_sessions_active (
            acct_session_id, acct_unique_id, username, user_id, nas_id,
            nas_ip_address, nas_port_id, service_type, framed_ip_address,
            calling_station_id, called_station_id, start_time, last_update
          ) VALUES (
            ${acct_session_id}, ${acct_unique_id}, ${username}, ${user_id}, ${nas[0].id},
            ${nas_ip_address}, ${nas_port_id}, ${service_type}, ${framed_ip_address},
            ${calling_station_id}, ${called_station_id}, NOW(), NOW()
          )
          ON CONFLICT (acct_session_id) DO UPDATE
          SET last_update = NOW()
        `

        // Log accounting event
        await sql`
          INSERT INTO radius_accounting (
            acct_session_id, username, nas_ip_address, event_type,
            framed_ip_address, event_time
          ) VALUES (
            ${acct_session_id}, ${username}, ${nas_ip_address}, 'Start',
            ${framed_ip_address}, NOW()
          )
        `
        break

      case "Interim-Update":
        // Update active session
        await sql`
          UPDATE radius_sessions_active
          SET 
            session_time = ${acct_session_time},
            bytes_in = ${acct_input_octets},
            bytes_out = ${acct_output_octets},
            packets_in = ${acct_input_packets},
            packets_out = ${acct_output_packets},
            last_update = NOW()
          WHERE acct_session_id = ${acct_session_id}
        `

        // Log interim update
        await sql`
          INSERT INTO radius_accounting (
            acct_session_id, username, nas_ip_address, event_type,
            bytes_in, bytes_out, packets_in, packets_out,
            session_time, framed_ip_address, event_time
          ) VALUES (
            ${acct_session_id}, ${username}, ${nas_ip_address}, 'Interim-Update',
            ${acct_input_octets}, ${acct_output_octets}, ${acct_input_packets}, ${acct_output_packets},
            ${acct_session_time}, ${framed_ip_address}, NOW()
          )
        `
        break

      case "Stop":
        // Get session data before archiving
        const sessions = await sql`
          SELECT * FROM radius_sessions_active
          WHERE acct_session_id = ${acct_session_id}
          LIMIT 1
        `

        if (sessions.length > 0) {
          // Archive session
          await sql`
            INSERT INTO radius_sessions_archive (
              acct_session_id, acct_unique_id, username, user_id, nas_id,
              nas_ip_address, nas_port_id, service_type, framed_ip_address,
              calling_station_id, called_station_id, start_time, stop_time,
              last_update, session_time, bytes_in, bytes_out, packets_in,
              packets_out, terminate_cause
            ) VALUES (
              ${acct_session_id}, ${acct_unique_id}, ${username}, ${user_id}, ${nas[0].id},
              ${nas_ip_address}, ${nas_port_id}, ${service_type}, ${framed_ip_address},
              ${calling_station_id}, ${called_station_id}, ${sessions[0].start_time}, NOW(),
              NOW(), ${acct_session_time}, ${acct_input_octets}, ${acct_output_octets},
              ${acct_input_packets}, ${acct_output_packets}, ${acct_terminate_cause}
            )
          `

          // Remove from active sessions
          await sql`
            DELETE FROM radius_sessions_active
            WHERE acct_session_id = ${acct_session_id}
          `
        }

        // Log stop event
        await sql`
          INSERT INTO radius_accounting (
            acct_session_id, username, nas_ip_address, event_type,
            bytes_in, bytes_out, packets_in, packets_out,
            session_time, framed_ip_address, terminate_cause, event_time
          ) VALUES (
            ${acct_session_id}, ${username}, ${nas_ip_address}, 'Stop',
            ${acct_input_octets}, ${acct_output_octets}, ${acct_input_packets}, ${acct_output_packets},
            ${acct_session_time}, ${framed_ip_address}, ${acct_terminate_cause}, NOW()
          )
        `
        break
    }

    return NextResponse.json({ status: "OK" }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] RADIUS accounting error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
