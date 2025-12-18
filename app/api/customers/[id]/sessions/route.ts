import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"

    // Get customer with their assigned IP address and router
    const customerData = await sql`
      SELECT 
        c.id,
        c.portal_username,
        ia.ip_address,
        ia.router_id,
        r.ip_address as router_host,
        r.api_port as router_port,
        r.api_username as router_username,
        r.api_password as router_password,
        r.connection_method as router_connection_method,
        r.name as router_name
      FROM customers c
      LEFT JOIN ip_addresses ia ON ia.customer_id = c.id AND ia.status = 'allocated'
      LEFT JOIN network_devices r ON r.id = ia.router_id
      WHERE c.id = ${customerId}
      LIMIT 1
    `

    if (customerData.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customer = customerData[0]

    // Try to fetch live sessions from MikroTik router
    if (customer.router_id && customer.router_host && (customer.portal_username || customer.ip_address)) {
      try {
        const mikrotik = createMikroTikClient(
          customer.router_id,
          customer.router_host,
          customer.router_port || 8728,
          customer.router_username,
          customer.router_password,
          customer.router_connection_method === "api_ssl",
        )

        const activeSessions = await mikrotik.getPPPoEActiveSessions()
        const customerSession = activeSessions.find(
          (session: any) => session.name === customer.portal_username || session.address === customer.ip_address,
        )

        if (customerSession) {
          const formattedSession = {
            id: customerSession[".id"] || "live-session",
            login_id: customerSession.name || customer.portal_username,
            data_in: customerSession.rx_bytes || 0,
            data_out: customerSession.tx_bytes || 0,
            start_time: customerSession.uptime
              ? new Date(Date.now() - parseUptime(customerSession.uptime)).toISOString()
              : new Date().toISOString(),
            duration: customerSession.uptime || "0s",
            ip_address: customerSession.address || customer.ip_address || "N/A",
            mac_address: customerSession["caller-id"] || "N/A",
            nas: customer.router_name || customer.router_host,
            status: "active" as const,
          }

          return NextResponse.json({
            success: true,
            sessions: [formattedSession],
            live: true,
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching live MikroTik sessions:", error)
      }
    }

    // Fall back to historical RADIUS logs
    return await getHistoricalSessions(sql, customerId, period)
  } catch (error) {
    console.error("Error fetching customer sessions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sessions" }, { status: 500 })
  }
}

async function getHistoricalSessions(sql: any, customerId: string, period: string) {
  try {
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
      live: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching historical sessions from radius_logs:", error)
    return NextResponse.json({
      success: true,
      sessions: [],
      live: false,
      message: "No historical session data available. RADIUS logging may not be configured.",
    })
  }
}

function parseUptime(uptime: string): number {
  const match = uptime.match(/(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/)
  if (!match) return 0

  const weeks = Number.parseInt(match[1] || "0") * 7 * 24 * 60 * 60 * 1000
  const days = Number.parseInt(match[2] || "0") * 24 * 60 * 60 * 1000
  const hours = Number.parseInt(match[3] || "0") * 60 * 60 * 1000
  const minutes = Number.parseInt(match[4] || "0") * 60 * 1000
  const seconds = Number.parseInt(match[5] || "0") * 1000

  return weeks + days + hours + minutes + seconds
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
