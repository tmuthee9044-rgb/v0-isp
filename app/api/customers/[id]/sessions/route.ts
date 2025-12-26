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
    const activeSessions = await sql`
      SELECT 
        rsa.acct_session_id as id,
        rsa.username as login_id,
        rsa.bytes_in as data_in,
        rsa.bytes_out as data_out,
        rsa.start_time,
        EXTRACT(EPOCH FROM (NOW() - rsa.start_time))::INTEGER as duration_seconds,
        rsa.framed_ip as ip_address,
        rsa.calling_station_id as mac_address,
        rn.name as nas,
        'active' as status
      FROM radius_sessions_active rsa
      JOIN radius_users ru ON rsa.user_id = ru.id
      LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
      WHERE ru.customer_id = ${customerId}
      ORDER BY rsa.start_time DESC
    `

    let archivedSessions = []

    switch (period) {
      case "today":
        archivedSessions = await sql`
          SELECT 
            rsa.acct_session_id as id,
            rsa.username as login_id,
            rsa.bytes_in as data_in,
            rsa.bytes_out as data_out,
            rsa.start_time,
            EXTRACT(EPOCH FROM (rsa.stop_time - rsa.start_time))::INTEGER as duration_seconds,
            rsa.framed_ip as ip_address,
            rsa.calling_station_id as mac_address,
            rn.name as nas,
            'expired' as status
          FROM radius_sessions_archive rsa
          JOIN radius_users ru ON rsa.user_id = ru.id
          LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
          WHERE ru.customer_id = ${customerId}
            AND DATE(rsa.start_time) = CURRENT_DATE
          ORDER BY rsa.start_time DESC
          LIMIT 50
        `
        break
      case "week":
        archivedSessions = await sql`
          SELECT 
            rsa.acct_session_id as id,
            rsa.username as login_id,
            rsa.bytes_in as data_in,
            rsa.bytes_out as data_out,
            rsa.start_time,
            EXTRACT(EPOCH FROM (rsa.stop_time - rsa.start_time))::INTEGER as duration_seconds,
            rsa.framed_ip as ip_address,
            rsa.calling_station_id as mac_address,
            rn.name as nas,
            'expired' as status
          FROM radius_sessions_archive rsa
          JOIN radius_users ru ON rsa.user_id = ru.id
          LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
          WHERE ru.customer_id = ${customerId}
            AND rsa.start_time >= NOW() - INTERVAL '7 days'
          ORDER BY rsa.start_time DESC
          LIMIT 50
        `
        break
      case "month":
        archivedSessions = await sql`
          SELECT 
            rsa.acct_session_id as id,
            rsa.username as login_id,
            rsa.bytes_in as data_in,
            rsa.bytes_out as data_out,
            rsa.start_time,
            EXTRACT(EPOCH FROM (rsa.stop_time - rsa.start_time))::INTEGER as duration_seconds,
            rsa.framed_ip as ip_address,
            rsa.calling_station_id as mac_address,
            rn.name as nas,
            'expired' as status
          FROM radius_sessions_archive rsa
          JOIN radius_users ru ON rsa.user_id = ru.id
          LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
          WHERE ru.customer_id = ${customerId}
            AND rsa.start_time >= NOW() - INTERVAL '30 days'
          ORDER BY rsa.start_time DESC
          LIMIT 50
        `
        break
      case "quarter":
        archivedSessions = await sql`
          SELECT 
            rsa.acct_session_id as id,
            rsa.username as login_id,
            rsa.bytes_in as data_in,
            rsa.bytes_out as data_out,
            rsa.start_time,
            EXTRACT(EPOCH FROM (rsa.stop_time - rsa.start_time))::INTEGER as duration_seconds,
            rsa.framed_ip as ip_address,
            rsa.calling_station_id as mac_address,
            rn.name as nas,
            'expired' as status
          FROM radius_sessions_archive rsa
          JOIN radius_users ru ON rsa.user_id = ru.id
          LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
          WHERE ru.customer_id = ${customerId}
            AND rsa.start_time >= NOW() - INTERVAL '90 days'
          ORDER BY rsa.start_time DESC
          LIMIT 50
        `
        break
      default:
        archivedSessions = await sql`
          SELECT 
            rsa.acct_session_id as id,
            rsa.username as login_id,
            rsa.bytes_in as data_in,
            rsa.bytes_out as data_out,
            rsa.start_time,
            EXTRACT(EPOCH FROM (rsa.stop_time - rsa.start_time))::INTEGER as duration_seconds,
            rsa.framed_ip as ip_address,
            rsa.calling_station_id as mac_address,
            rn.name as nas,
            'expired' as status
          FROM radius_sessions_archive rsa
          JOIN radius_users ru ON rsa.user_id = ru.id
          LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
          WHERE ru.customer_id = ${customerId}
          ORDER BY rsa.start_time DESC
          LIMIT 50
        `
    }

    // Combine active and archived sessions
    const allSessions = [...activeSessions, ...archivedSessions]

    // Format the sessions data
    const formattedSessions = allSessions.map((session) => ({
      id: session.id.toString(),
      login_id: session.login_id,
      data_in: session.data_in || 0,
      data_out: session.data_out || 0,
      start_time: session.start_time,
      duration: formatDuration(session.duration_seconds || 0),
      ip_address: session.ip_address || "N/A",
      mac_address: session.mac_address || "N/A",
      nas: session.nas || "Unknown",
      status: session.status,
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      live: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching historical sessions from RADIUS tables:", error)
    return NextResponse.json({
      success: true,
      sessions: [],
      live: false,
      message: "No session data available. Ensure RADIUS is properly configured and customers have active services.",
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
