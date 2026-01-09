import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")

    const bandwidth = await sql`
      SELECT 
        nd.name as router_name,
        nd.location as location,
        COALESCE(AVG(rph.bandwidth_out), 0)::int as upload_mbps,
        COALESCE(AVG(rph.bandwidth_in), 0)::int as download_mbps,
        COALESCE(MAX(rph.bandwidth_in + rph.bandwidth_out), 0)::int as peak_usage,
        COALESCE(AVG(rph.bandwidth_in + rph.bandwidth_out), 0)::int as avg_usage
      FROM network_devices nd
      LEFT JOIN router_performance_history rph ON nd.id = rph.router_id 
        AND rph.timestamp >= CURRENT_DATE - INTERVAL '7 days'
      WHERE nd.status = 'connected' AND nd.type = 'router' 
        ${location && location !== "all" ? sql`AND nd.location = ${location}` : sql``}
      GROUP BY nd.id, nd.name, nd.location
      ORDER BY nd.name
    `

    return NextResponse.json(bandwidth)
  } catch (error) {
    console.error("Failed to fetch bandwidth data:", error)
    return NextResponse.json({ error: "Failed to fetch bandwidth data" }, { status: 500 })
  }
}
