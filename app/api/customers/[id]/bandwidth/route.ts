import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"

    const customerService = await sql`
      SELECT 
        cs.id as service_id,
        c.portal_username,
        ip.ip_address,
        ip.router_id,
        r.host as router_host,
        r.port as router_port,
        r.username as router_username,
        r.password as router_password,
        r.use_ssl as router_use_ssl
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ip ON ip.customer_id = c.id AND ip.status = 'active'
      LEFT JOIN network_devices r ON r.id = ip.router_id
      WHERE cs.customer_id = ${customerId}
        AND cs.status = 'active'
      LIMIT 1
    `

    if (customerService.length === 0 || (!customerService[0].portal_username && !customerService[0].ip_address)) {
      return await getHistoricalBandwidth(sql, customerId, period)
    }

    const service = customerService[0]

    if (service.router_id && service.router_host) {
      try {
        const mikrotik = createMikroTikClient(
          service.router_id,
          service.router_host,
          service.router_port || 443,
          service.router_username,
          service.router_password,
          service.router_use_ssl !== false,
        )

        const activeSessions = await mikrotik.getPPPoEActiveSessions()
        const customerSession = activeSessions.find(
          (session: any) => session.name === service.portal_username || session.address === service.ip_address,
        )

        if (customerSession) {
          const now = new Date()
          const dataPoints = []

          // Create 24 hourly data points for "today" view
          const pointsCount = period === "today" ? 24 : period === "week" ? 168 : period === "month" ? 30 : 90
          const intervalMs = period === "today" ? 3600000 : period === "week" ? 3600000 : 86400000 // 1 hour or 1 day

          for (let i = pointsCount - 1; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * intervalMs)
            dataPoints.push({
              timestamp: timestamp.toLocaleTimeString(),
              download: i === 0 ? Math.round((customerSession.rx_bytes || 0) / 1024 / 1024) : 0,
              upload: i === 0 ? Math.round((customerSession.tx_bytes || 0) / 1024 / 1024) : 0,
            })
          }

          return NextResponse.json({
            success: true,
            data: dataPoints,
            live: true,
            currentSpeed: {
              download: Math.round((customerSession.rx_bytes || 0) / 1024 / 1024),
              upload: Math.round((customerSession.tx_bytes || 0) / 1024 / 1024),
            },
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching live MikroTik data:", error)
        // Fall through to historical data
      }
    }

    return await getHistoricalBandwidth(sql, customerId, period)
  } catch (error) {
    console.error("Error fetching bandwidth data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bandwidth data" }, { status: 500 })
  }
}

async function getHistoricalBandwidth(sql: any, customerId: string, period: string) {
  try {
    let bandwidthData

    switch (period) {
      case "today":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND DATE(rl.log_timestamp) = CURRENT_DATE
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 24
        `
        break
      case "week":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 168
        `
        break
      case "month":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 30
        `
        break
      case "quarter":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '90 days'
          GROUP BY DATE_TRUNC('day', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 90
        `
        break
      default:
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND DATE(rl.log_timestamp) = CURRENT_DATE
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 24
        `
    }

    // Format the data for the chart
    const formattedData = bandwidthData
      .map((record) => ({
        timestamp: new Date(record.timestamp).toLocaleTimeString(),
        download: Math.round((record.total_download || 0) / 1024 / 1024), // Convert to MB
        upload: Math.round((record.total_upload || 0) / 1024 / 1024), // Convert to MB
      }))
      .reverse()

    return NextResponse.json({
      success: true,
      data: formattedData,
      live: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching historical bandwidth, radius_logs may not exist:", error)
    return NextResponse.json({
      success: true,
      data: [],
      live: false,
      message: "No historical bandwidth data available. Configure RADIUS logging to track bandwidth usage.",
    })
  }
}
