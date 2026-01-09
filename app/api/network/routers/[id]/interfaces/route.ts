import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const isSnapshot = searchParams.get("snapshot") === "true"
    const range = searchParams.get("range") || "24h"

    const routers = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!routers || routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const latestSnapshot = await sql`
      SELECT *
      FROM router_performance_history
      WHERE router_id = ${routerId}
      ORDER BY timestamp DESC
      LIMIT 1
    `

    let hoursBack = 24
    if (range === "7d") hoursBack = 24 * 7
    if (range === "30d") hoursBack = 24 * 30

    const historicalSnapshots = await sql`
      SELECT *
      FROM router_performance_history
      WHERE router_id = ${routerId}
        AND timestamp > NOW() - INTERVAL '${sql.unsafe(hoursBack.toString())} hours'
      ORDER BY timestamp DESC
    `

    const trafficHistory = historicalSnapshots.map((snapshot: any) => ({
      interface: "all",
      history: [
        {
          time: snapshot.timestamp,
          rxMbps: snapshot.bandwidth_in || 0,
          txMbps: snapshot.bandwidth_out || 0,
        },
      ],
    }))

    const interfaces =
      latestSnapshot.length > 0
        ? [
            {
              name: "Router Total",
              type: "aggregate",
              running: true,
              disabled: false,
              rxBytes: 0,
              txBytes: 0,
              rxPackets: 0,
              txPackets: 0,
              rxErrors: 0,
              txErrors: 0,
              rxDrops: 0,
              txDrops: 0,
            },
          ]
        : []

    console.log("[v0] Returning database snapshot data:", historicalSnapshots.length, "data points from database")

    return NextResponse.json({
      success: true,
      interfaces,
      trafficHistory,
      isSnapshot: true,
      lastUpdated: latestSnapshot[0]?.timestamp || null,
    })
  } catch (error: any) {
    console.error("Error fetching interface snapshots:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch interface data" }, { status: 500 })
  }
}
