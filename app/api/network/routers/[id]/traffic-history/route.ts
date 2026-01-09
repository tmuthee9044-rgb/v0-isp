import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()

  try {
    const routerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "24h"

    console.log(`[v0] Fetching traffic history for router ${routerId}, range: ${range}`)

    // Calculate time range
    let hours = 24
    if (range === "7d") hours = 168
    if (range === "30d") hours = 720

    const history = await sql`
      SELECT 
        timestamp as time,
        bandwidth_out as tx,
        bandwidth_in as rx
      FROM router_performance_history
      WHERE router_id = ${routerId}
        AND timestamp > NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      history: history.map((h) => ({
        time: h.time,
        tx: Number.parseFloat(h.tx) || 0,
        rx: Number.parseFloat(h.rx) || 0,
      })),
    })
  } catch (error) {
    console.error("[v0] Traffic history error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch traffic history" }, { status: 500 })
  }
}
