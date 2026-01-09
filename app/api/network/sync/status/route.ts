import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching sync status...")

    const syncStatuses = await sql`
      SELECT 
        rss.id,
        r.name as router_name,
        r.type as router_type,
        COALESCE(ip.ip_address::text, 'N/A') as ip_address,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unknown') as customer_name,
        rss.sync_status,
        rss.retry_count,
        rss.last_checked,
        rss.last_synced,
        rss.sync_message
      FROM router_sync_status rss
      LEFT JOIN network_devices r ON rss.router_id = r.id
      LEFT JOIN ip_addresses ip ON rss.ip_address_id = ip.id
      LEFT JOIN customer_services cs ON rss.customer_service_id = cs.id
      LEFT JOIN customers c ON cs.customer_id = c.id
      ORDER BY rss.last_checked DESC
    `

    console.log(`[v0] Fetched ${syncStatuses.length} sync status records`)
    return NextResponse.json(syncStatuses)
  } catch (error) {
    console.error("[v0] Failed to fetch sync status:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Return empty array instead of error to prevent UI from breaking
    return NextResponse.json([])
  }
}
