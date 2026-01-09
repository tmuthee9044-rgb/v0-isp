import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const categoryStats = await sql`
      SELECT 
        category,
        COUNT(*)::int as count,
        ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM tasks)) * 100)::int as percentage
      FROM tasks
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `

    const priorityStats = await sql`
      SELECT 
        priority,
        COUNT(*)::int as count,
        ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM tasks)) * 100)::int as percentage
      FROM tasks
      WHERE priority IS NOT NULL
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END
    `

    const workloadStats = await sql`
      SELECT 
        e.name,
        e.id,
        COUNT(t.id)::int as task_count,
        COUNT(*) FILTER (WHERE t.status = 'in_progress')::int as active_tasks,
        COUNT(*) FILTER (WHERE t.status = 'pending')::int as pending_tasks
      FROM employees e
      LEFT JOIN tasks t ON t.assigned_to = e.id
      WHERE e.status = 'active'
      GROUP BY e.id, e.name
      HAVING COUNT(t.id) > 0
      ORDER BY task_count DESC
      LIMIT 10
    `

    return NextResponse.json({
      category_stats: categoryStats,
      priority_stats: priorityStats,
      workload_stats: workloadStats,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching analytics data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
