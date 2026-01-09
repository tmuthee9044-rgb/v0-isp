import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assignedTo = searchParams.get("assignedTo")
    const department = searchParams.get("department")

    let query = sql`
      SELECT 
        t.*,
        e1.name as assigned_to_name,
        e2.name as assigned_by_name
      FROM tasks t
      LEFT JOIN employees e1 ON t.assigned_to = e1.id
      LEFT JOIN employees e2 ON t.assigned_by = e2.id
      WHERE 1=1
    `

    if (status && status !== "all") {
      query = sql`
        SELECT 
          t.*,
          e1.name as assigned_to_name,
          e2.name as assigned_by_name
        FROM tasks t
        LEFT JOIN employees e1 ON t.assigned_to = e1.id
        LEFT JOIN employees e2 ON t.assigned_by = e2.id
        WHERE t.status = ${status}
      `
    }

    const tasks = await query

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const {
      title,
      description,
      assigned_to,
      assigned_by,
      department,
      category,
      priority,
      due_date,
      estimated_hours,
      tags,
    } = body

    const [task] = await sql`
      INSERT INTO tasks (
        title, description, assigned_to, assigned_by, department, 
        category, priority, due_date, estimated_hours, tags
      ) VALUES (
        ${title}, ${description}, ${assigned_to}, ${assigned_by}, ${department},
        ${category}, ${priority || "medium"}, ${due_date}, ${estimated_hours}, ${tags || []}
      )
      RETURNING *
    `

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error("[v0] Error creating task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
