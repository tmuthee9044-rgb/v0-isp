import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employee_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    let whereClause = "WHERE st.assigned_to IS NOT NULL"
    const params: any[] = []

    if (employeeId) {
      whereClause += " AND st.assigned_to = $" + (params.length + 1)
      params.push(employeeId)
    }

    if (startDate) {
      whereClause += " AND st.created_at >= $" + (params.length + 1)
      params.push(startDate)
    }

    if (endDate) {
      whereClause += " AND st.created_at <= $" + (params.length + 1)
      params.push(endDate)
    }

    // Get performance metrics for employees
    const performanceData = await sql`
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.department,
        COUNT(st.id) as total_tickets,
        COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN st.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN st.status = 'in_progress' THEN 1 END) as in_progress_tickets,
        AVG(
          CASE 
            WHEN st.status = 'resolved' AND st.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 3600 
          END
        ) as avg_resolution_time_hours,
        AVG(
          CASE 
            WHEN st.status = 'resolved' 
            THEN EXTRACT(EPOCH FROM (COALESCE(st.resolved_at, NOW()) - st.created_at)) / 3600 
          END
        ) as avg_response_time_hours,
        COUNT(CASE WHEN st.priority = 'high' AND st.status = 'resolved' THEN 1 END) as high_priority_resolved,
        COUNT(CASE WHEN st.priority = 'urgent' AND st.status = 'resolved' THEN 1 END) as urgent_resolved,
        ROUND(
          (COUNT(CASE WHEN st.status = 'resolved' THEN 1 END)::numeric / 
           NULLIF(COUNT(st.id), 0) * 100), 2
        ) as resolution_rate
      FROM employees e
      LEFT JOIN support_tickets st ON e.id = st.assigned_to
      ${whereClause}
      GROUP BY e.id, e.first_name, e.last_name, e.department
      HAVING COUNT(st.id) > 0
      ORDER BY resolution_rate DESC, avg_resolution_time_hours ASC
    `

    return NextResponse.json({ performance: performanceData })
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticket_id, employee_id, action_type, time_spent, items_used, resolution_notes, customer_satisfaction } =
      body

    // Record performance tracking entry
    const [performanceEntry] = await sql`
      INSERT INTO employee_performance_tracking (
        ticket_id, employee_id, action_type, time_spent, items_used, 
        resolution_notes, customer_satisfaction, created_at
      ) VALUES (
        ${ticket_id}, ${employee_id}, ${action_type}, ${time_spent}, 
        ${items_used}, ${resolution_notes}, ${customer_satisfaction}, NOW()
      ) RETURNING *
    `

    // Update ticket resolution time if this is a resolution action
    if (action_type === "resolved") {
      await sql`
        UPDATE support_tickets 
        SET resolved_at = NOW(), status = 'resolved'
        WHERE id = ${ticket_id}
      `
    }

    return NextResponse.json({ performanceEntry }, { status: 201 })
  } catch (error) {
    console.error("Error recording performance data:", error)
    return NextResponse.json({ error: "Failed to record performance data" }, { status: 500 })
  }
}
