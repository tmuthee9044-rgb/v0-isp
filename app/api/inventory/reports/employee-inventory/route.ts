import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const department = searchParams.get("department")
    const status = searchParams.get("status") || "all"

    const whereConditions = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (employeeId) {
      whereConditions.push(`e.id = $${paramIndex}`)
      queryParams.push(Number.parseInt(employeeId))
      paramIndex++
    }

    if (department) {
      whereConditions.push(`e.department = $${paramIndex}`)
      queryParams.push(department)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const employeeSummaryQuery = `
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.status,
        0 as total_items_assigned,
        0 as active_assignments,
        0 as returned_items,
        0 as total_value_assigned,
        0 as active_value
      FROM employees e
      ${whereClause}
      ORDER BY e.last_name, e.first_name
    `

    const departmentSummaryQuery = `
      SELECT 
        e.department,
        COUNT(DISTINCT e.id) as total_employees,
        0 as total_items_assigned,
        0 as active_assignments,
        0 as total_value_assigned,
        0 as active_value
      FROM employees e
      WHERE e.status = 'active'
      GROUP BY e.department
      ORDER BY total_employees DESC
    `

    const [employeeSummary, departmentSummary] = await Promise.all([
      queryParams.length > 0
        ? sql.query(employeeSummaryQuery, queryParams)
        : sql`
          SELECT 
            e.id as employee_id,
            e.first_name,
            e.last_name,
            e.email,
            e.department,
            e.position,
            e.status,
            0 as total_items_assigned,
            0 as active_assignments,
            0 as returned_items,
            0 as total_value_assigned,
            0 as active_value
          FROM employees e
          ORDER BY e.last_name, e.first_name
        `,
      sql`
        SELECT 
          e.department,
          COUNT(DISTINCT e.id) as total_employees,
          0 as total_items_assigned,
          0 as active_assignments,
          0 as total_value_assigned,
          0 as active_value
        FROM employees e
        WHERE e.status = 'active'
        GROUP BY e.department
        ORDER BY total_employees DESC
      `,
    ])

    return NextResponse.json({
      success: true,
      data: {
        assignments: [], // Empty assignments since inventory_movements table doesn't exist
        employeeSummary: employeeSummary.map((item: any) => ({
          ...item,
          total_value_assigned: Number.parseFloat(item.total_value_assigned || "0"),
          active_value: Number.parseFloat(item.active_value || "0"),
        })),
        departmentSummary: departmentSummary.map((item: any) => ({
          ...item,
          total_value_assigned: Number.parseFloat(item.total_value_assigned || "0"),
          active_value: Number.parseFloat(item.active_value || "0"),
        })),
        filters: { employeeId, department, status },
        note: "Inventory assignment tracking requires the inventory_movements table to be created.",
      },
    })
  } catch (error) {
    console.error("Error generating employee inventory report:", error)
    return NextResponse.json({ success: false, error: "Failed to generate employee inventory report" }, { status: 500 })
  }
}
