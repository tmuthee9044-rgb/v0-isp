import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const activities = await sql`
      SELECT 
        activity_type,
        description,
        created_at,
        severity
      FROM activity_logs
      WHERE module = 'HR'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error("Error fetching HR activities:", error)
    return NextResponse.json({ activities: [] })
  }
}
