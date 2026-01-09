import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const [stats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'overdue')::int as overdue,
        AVG(CASE 
          WHEN status = 'completed' AND completed_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_date - created_date)) / 86400 
          ELSE NULL 
        END) as avg_completion_days
      FROM tasks
    `

    const departmentStats = await sql`
      SELECT
        department,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'overdue')::int as overdue
      FROM tasks
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY total DESC
      LIMIT 5
    `

    return NextResponse.json({
      stats: {
        ...stats,
        avg_completion_time: stats.avg_completion_days ? Number.parseFloat(stats.avg_completion_days.toFixed(1)) : 0,
        on_time_completion:
          stats.completed > 0 ? Math.round(((stats.completed - stats.overdue) / stats.completed) * 100) : 0,
      },
      department_stats: departmentStats,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching task stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
