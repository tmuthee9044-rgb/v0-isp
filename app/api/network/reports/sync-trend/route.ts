import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || "30 days ago"
    const to = searchParams.get("to") || "now"

    const syncTrend = await sql`
      SELECT 
        DATE(rss.last_checked) as date,
        COUNT(CASE WHEN rss.sync_status = 'in_sync' THEN 1 END) as in_sync,
        COUNT(CASE WHEN rss.sync_status = 'out_of_sync' THEN 1 END) as out_of_sync,
        COUNT(CASE WHEN rss.sync_status = 'pending' THEN 1 END) as pending,
        COUNT(*) as total,
        ROUND((COUNT(CASE WHEN rss.sync_status = 'in_sync' THEN 1 END)::float / COUNT(*)::float) * 100) as health_percentage
      FROM router_sync_status rss
      WHERE rss.last_checked >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(rss.last_checked)
      ORDER BY date DESC
      LIMIT 30
    `

    return NextResponse.json(syncTrend.reverse())
  } catch (error) {
    console.error("Failed to fetch sync trend data:", error)
    return NextResponse.json({ error: "Failed to fetch sync trend data" }, { status: 500 })
  }
}
