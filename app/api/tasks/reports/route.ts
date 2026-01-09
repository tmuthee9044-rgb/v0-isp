import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    const [monthlySummary] = await sql`
      SELECT
        COUNT(*)::int as tasks_created,
        COUNT(*) FILTER (WHERE status = 'completed')::int as tasks_completed,
        ROUND(AVG(CASE 
          WHEN status = 'completed' AND completed_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_date - created_date)) / 86400 
        END), 1) as avg_completion_days,
        ROUND(
          (COUNT(*) FILTER (WHERE completed_date <= due_date)::float / 
           NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100
        )::int as on_time_rate,
        ROUND(AVG(progress))::int as avg_progress
      FROM tasks
      WHERE DATE_TRUNC('month', created_date) = DATE_TRUNC('month', ${month}::date)
    `

    return NextResponse.json({
      monthly_summary: monthlySummary || {
        tasks_created: 0,
        tasks_completed: 0,
        avg_completion_days: 0,
        on_time_rate: 0,
        avg_progress: 0,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching report data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
