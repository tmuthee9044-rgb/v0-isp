import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const activities = await sql`
      SELECT 
        action as activity_type,
        details->>'description' as description,
        created_at,
        COALESCE(details->>'severity', 'info') as severity
      FROM activity_logs
      WHERE entity_type = 'HR' OR entity_type = 'employee'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error("Error fetching HR activities:", error)
    return NextResponse.json({ activities: [] })
  }
}
