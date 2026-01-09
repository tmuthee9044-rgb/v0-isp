import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const recentActivity = await sql`
      SELECT 
        t.id,
        t.title,
        t.status,
        t.progress,
        e1.name as assigned_to_name,
        e2.name as assigned_by_name,
        t.completed_date,
        t.updated_date,
        CASE 
          WHEN t.status = 'completed' THEN 'completed'
          WHEN t.status = 'in_progress' THEN 'in_progress'
          WHEN t.status = 'overdue' THEN 'overdue'
          ELSE 'assigned'
        END as activity_type
      FROM tasks t
      LEFT JOIN employees e1 ON t.assigned_to = e1.id
      LEFT JOIN employees e2 ON t.assigned_by = e2.id
      ORDER BY 
        CASE 
          WHEN t.status = 'completed' THEN t.completed_date
          ELSE t.updated_date
        END DESC
      LIMIT 10
    `

    return NextResponse.json({ recent_activity: recentActivity })
  } catch (error: any) {
    console.error("[v0] Error fetching activity data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
