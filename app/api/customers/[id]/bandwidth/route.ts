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
        r.ip_address as router_host,
        r.api_port as router_port,
        r.api_username as router_username,
        r.api_password as router_password,
        r.connection_method as router_connection_method
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
        const mikrotik = await createMikroTikClient(
          service.router_id,
          service.router_host,
          service.router_port || 443,
          service.router_username,
          service.router_password,
          service.router_connection_method !== "http",
        )

        if (mikrotik) {
          const activeSessions = await mikrotik.getPPPoEActiveSessions()
          const customerSession = activeSessions.find(
            (session: any) => session.name === service.portal_username || session.address === service.ip_address,
          )

          if (customerSession) {
            await storeCustomerBandwidthUsage(sql, {
              customer_id: customerId,
              device_id: service.router_id,
              ip_address: service.ip_address,
              bytes_in: customerSession.rx_bytes,
              bytes_out: customerSession.tx_bytes,
            })

            const now = new Date()
            const dataPoints = []

            const pointsCount = period === "today" ? 24 : period === "week" ? 168 : period === "month" ? 30 : 90
            const intervalMs = period === "today" ? 3600000 : period === "week" ? 3600000 : 86400000

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

async function storeCustomerBandwidthUsage(
  sql: any,
  data: {
    customer_id: string
    device_id: number
    ip_address: string
    bytes_in: number
    bytes_out: number
  },
) {
  try {
    const dateHour = new Date()
    dateHour.setMinutes(0, 0, 0)

    await sql`
      INSERT INTO bandwidth_usage (
        customer_id, 
        device_id, 
        ip_address, 
        date_hour, 
        bytes_in, 
        bytes_out,
        created_at
      )
      VALUES (
        ${data.customer_id},
        ${data.device_id},
        ${data.ip_address},
        ${dateHour.toISOString()},
        ${data.bytes_in},
        ${data.bytes_out},
        NOW()
      )
      ON CONFLICT (customer_id, device_id, ip_address, date_hour) 
      DO UPDATE SET
        bytes_in = bandwidth_usage.bytes_in + ${data.bytes_in},
        bytes_out = bandwidth_usage.bytes_out + ${data.bytes_out}
    `

    console.log(`[v0] Stored bandwidth usage for customer ${data.customer_id}`)
  } catch (error) {
    console.error("[v0] Error storing bandwidth usage:", error)
  }
}

async function getHistoricalBandwidth(sql: any, customerId: string, period: string) {
  try {
    let bandwidthData

    switch (period) {
      case "today":
        bandwidthData = await sql`
          SELECT 
            date_hour as timestamp,
            SUM(bytes_in) as total_download,
            SUM(bytes_out) as total_upload
          FROM bandwidth_usage
          WHERE customer_id = ${customerId}
            AND DATE(date_hour) = CURRENT_DATE
          GROUP BY date_hour
          ORDER BY date_hour DESC
          LIMIT 24
        `
        break
      case "week":
        bandwidthData = await sql`
          SELECT 
            date_hour as timestamp,
            SUM(bytes_in) as total_download,
            SUM(bytes_out) as total_upload
          FROM bandwidth_usage
          WHERE customer_id = ${customerId}
            AND date_hour >= NOW() - INTERVAL '7 days'
          GROUP BY date_hour
          ORDER BY date_hour DESC
          LIMIT 168
        `
        break
      case "month":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', date_hour) as timestamp,
            SUM(bytes_in) as total_download,
            SUM(bytes_out) as total_upload
          FROM bandwidth_usage
          WHERE customer_id = ${customerId}
            AND date_hour >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', date_hour)
          ORDER BY timestamp DESC
          LIMIT 30
        `
        break
      case "quarter":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', date_hour) as timestamp,
            SUM(bytes_in) as total_download,
            SUM(bytes_out) as total_upload
          FROM bandwidth_usage
          WHERE customer_id = ${customerId}
            AND date_hour >= NOW() - INTERVAL '90 days'
          GROUP BY DATE_TRUNC('day', date_hour)
          ORDER BY timestamp DESC
          LIMIT 90
        `
        break
      default:
        bandwidthData = await sql`
          SELECT 
            date_hour as timestamp,
            SUM(bytes_in) as total_download,
            SUM(bytes_out) as total_upload
          FROM bandwidth_usage
          WHERE customer_id = ${customerId}
            AND DATE(date_hour) = CURRENT_DATE
          GROUP BY date_hour
          ORDER BY date_hour DESC
          LIMIT 24
        `
    }

    const formattedData = bandwidthData
      .map((record) => ({
        timestamp: new Date(record.timestamp).toLocaleTimeString(),
        download: Math.round((record.total_download || 0) / 1024 / 1024),
        upload: Math.round((record.total_upload || 0) / 1024 / 1024),
      }))
      .reverse()

    return NextResponse.json({
      success: true,
      data: formattedData,
      live: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching historical bandwidth:", error)
    return NextResponse.json({
      success: true,
      data: [],
      live: false,
      message: "No historical bandwidth data available. Data will be collected from router sessions.",
    })
  }
}
