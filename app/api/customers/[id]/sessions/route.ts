import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const service = searchParams.get("service") || "all"
    const period = searchParams.get("period") || "today"

    // Query radius logs for session data
    let sessions

    switch (period) {
      case "today":
        sessions = await sql`
          SELECT 
            rl.id,
            rl.username as login_id,
            rl.acct_input_octets as data_in,
            rl.acct_output_octets as data_out,
            rl.log_timestamp as start_time,
            rl.acct_session_time as duration_seconds,
            rl.framed_ip as ip_address,
            rl.calling_station_id as mac_address,
            rl.nas_ip as nas,
            CASE 
              WHEN rl.acct_status_type = 'Start' THEN 'active'
              WHEN rl.acct_status_type = 'Stop' THEN 'expired'
              ELSE 'suspended'
            END as status
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND DATE(rl.log_timestamp) = CURRENT_DATE
          ORDER BY rl.log_timestamp DESC
          LIMIT 50
        `
        break
      case "week":
        sessions = await sql`
          SELECT 
            rl.id,
            rl.username as login_id,
            rl.acct_input_octets as data_in,
            rl.acct_output_octets as data_out,
            rl.log_timestamp as start_time,
            rl.acct_session_time as duration_seconds,
            rl.framed_ip as ip_address,
            rl.calling_station_id as mac_address,
            rl.nas_ip as nas,
            CASE 
              WHEN rl.acct_status_type = 'Start' THEN 'active'
              WHEN rl.acct_status_type = 'Stop' THEN 'expired'
              ELSE 'suspended'
            END as status
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '7 days'
          ORDER BY rl.log_timestamp DESC
          LIMIT 50
        `
        break
      case "month":
        sessions = await sql`
          SELECT 
            rl.id,
            rl.username as login_id,
            rl.acct_input_octets as data_in,
            rl.acct_output_octets as data_out,
            rl.log_timestamp as start_time,
            rl.acct_session_time as duration_seconds,
            rl.framed_ip as ip_address,
            rl.calling_station_id as mac_address,
            rl.nas_ip as nas,
            CASE 
              WHEN rl.acct_status_type = 'Start' THEN 'active'
              WHEN rl.acct_status_type = 'Stop' THEN 'expired'
              ELSE 'suspended'
            END as status
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '30 days'
          ORDER BY rl.log_timestamp DESC
          LIMIT 50
        `
        break
      case "quarter":
        sessions = await sql`
          SELECT 
            rl.id,
            rl.username as login_id,
            rl.acct_input_octets as data_in,
            rl.acct_output_octets as data_out,
            rl.log_timestamp as start_time,
            rl.acct_session_time as duration_seconds,
            rl.framed_ip as ip_address,
            rl.calling_station_id as mac_address,
            rl.nas_ip as nas,
            CASE 
              WHEN rl.acct_status_type = 'Start' THEN 'active'
              WHEN rl.acct_status_type = 'Stop' THEN 'expired'
              ELSE 'suspended'
            END as status
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '90 days'
          ORDER BY rl.log_timestamp DESC
          LIMIT 50
        `
        break
      default:
        sessions = await sql`
          SELECT 
            rl.id,
            rl.username as login_id,
            rl.acct_input_octets as data_in,
            rl.acct_output_octets as data_out,
            rl.log_timestamp as start_time,
            rl.acct_session_time as duration_seconds,
            rl.framed_ip as ip_address,
            rl.calling_station_id as mac_address,
            rl.nas_ip as nas,
            CASE 
              WHEN rl.acct_status_type = 'Start' THEN 'active'
              WHEN rl.acct_status_type = 'Stop' THEN 'expired'
              ELSE 'suspended'
            END as status
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
          ORDER BY rl.log_timestamp DESC
          LIMIT 50
        `
    }

    // Format the sessions data
    const formattedSessions = sessions.map((session) => ({
      id: session.id.toString(),
      login_id: session.login_id,
      data_in: session.data_in || 0,
      data_out: session.data_out || 0,
      start_time: session.start_time,
      duration: formatDuration(session.duration_seconds || 0),
      ip_address: session.ip_address,
      mac_address: session.mac_address,
      nas: session.nas,
      status: session.status,
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error("Error fetching customer sessions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sessions" }, { status: 500 })
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
