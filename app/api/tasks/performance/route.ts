import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const employeePerformance = await sql`
      SELECT 
        e.name,
        e.id,
        COUNT(t.id)::int as task_count,
        COUNT(*) FILTER (WHERE t.status = 'completed')::int as completed_tasks,
        COUNT(*) FILTER (WHERE t.completed_date <= t.due_date)::int as on_time_tasks,
        ROUND(
          (COUNT(*) FILTER (WHERE t.status = 'completed')::float / NULLIF(COUNT(t.id), 0)) * 100
        )::int as completion_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE t.completed_date <= t.due_date)::float / NULLIF(COUNT(*) FILTER (WHERE t.status = 'completed'), 0)) * 100
        )::int as on_time_rate
      FROM employees e
      LEFT JOIN tasks t ON t.assigned_to = e.id
      WHERE e.status = 'active'
      GROUP BY e.id, e.name
      HAVING COUNT(t.id) > 0
      ORDER BY completion_rate DESC, on_time_rate DESC
      LIMIT 10
    `

    const performanceTrends = await sql`
      SELECT
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed')::float / NULLIF(COUNT(*), 0)) * 100
        )::int as completion_rate,
        ROUND(AVG(CASE WHEN status = 'completed' THEN progress ELSE NULL END))::int as quality_score,
        ROUND(
          (COUNT(*) FILTER (WHERE completed_date <= due_date)::float / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100
        )::int as on_time_delivery,
        ROUND(AVG(CASE WHEN tags @> ARRAY['team']::text[] THEN 90 ELSE 80 END))::int as team_collaboration
      FROM tasks
      WHERE created_date >= NOW() - INTERVAL '30 days'
    `

    return NextResponse.json({
      employee_performance: employeePerformance,
      performance_trends: performanceTrends[0] || {
        completion_rate: 0,
        quality_score: 0,
        on_time_delivery: 0,
        team_collaboration: 0,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching performance data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
