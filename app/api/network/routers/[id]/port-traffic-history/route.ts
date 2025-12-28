import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()

  try {
    const routerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "24h"

    console.log(`[v0] Fetching per-port traffic history for router ${routerId}, range: ${range}`)

    // Calculate time range
    let interval = "24 hours"
    switch (range) {
      case "1h":
        interval = "1 hour"
        break
      case "6h":
        interval = "6 hours"
        break
      case "12h":
        interval = "12 hours"
        break
      case "24h":
        interval = "24 hours"
        break
      case "7d":
        interval = "7 days"
        break
      case "30d":
        interval = "30 days"
        break
      case "90d":
        interval = "90 days"
        break
      case "1y":
        interval = "1 year"
        break
      default:
        interval = "24 hours"
    }

    // Get interface list from router
    const interfaces = await sql`
      SELECT DISTINCT interface_name
      FROM interface_traffic_history
      WHERE router_id = ${routerId}
      ORDER BY interface_name
    `

    // Fetch historical data for each interface
    const history = await sql`
      SELECT 
        interface_name as port,
        timestamp as time,
        rx_bytes,
        tx_bytes,
        rx_packets,
        tx_packets
      FROM interface_traffic_history
      WHERE router_id = ${routerId}
        AND timestamp > NOW() - INTERVAL '${sql.unsafe(interval)}'
      ORDER BY timestamp DESC, interface_name
      LIMIT 1000
    `

    // Group by time periods for aggregation
    const aggregatedData: Record<string, any> = {}

    history.forEach((record) => {
      const timeKey = new Date(record.time).toISOString()

      if (!aggregatedData[timeKey]) {
        aggregatedData[timeKey] = {
          time: timeKey,
        }
      }

      // Convert bytes to Mbps (assuming 5-minute collection interval)
      const rxMbps = (Number(record.rx_bytes) * 8) / (5 * 60 * 1000000)
      const txMbps = (Number(record.tx_bytes) * 8) / (5 * 60 * 1000000)

      aggregatedData[timeKey][`${record.port}_rx`] = rxMbps
      aggregatedData[timeKey][`${record.port}_tx`] = txMbps
    })

    const formattedHistory = Object.values(aggregatedData).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    )

    return NextResponse.json({
      success: true,
      ports: interfaces.map((i) => i.interface_name),
      history: formattedHistory,
    })
  } catch (error) {
    console.error("[v0] Per-port traffic history error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch port traffic history" }, { status: 500 })
  }
}
