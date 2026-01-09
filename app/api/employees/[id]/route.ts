import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const employee = await sql`
      SELECT 
        e.*,
        d.name as department_name,
        r.name as role_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ${id}
    `

    if (employee.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee[0])
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await request.json()

    const {
      first_name,
      last_name,
      email,
      phone,
      department_id,
      role_id,
      salary,
      hire_date,
      status,
      address,
      emergency_contact_name,
      emergency_contact_phone,
    } = body

    const result = await sql`
      UPDATE employees 
      SET 
        first_name = ${first_name},
        last_name = ${last_name},
        email = ${email},
        phone = ${phone},
        department_id = ${department_id},
        role_id = ${role_id},
        salary = ${salary},
        hire_date = ${hire_date},
        status = ${status},
        address = ${address},
        emergency_contact_name = ${emergency_contact_name},
        emergency_contact_phone = ${emergency_contact_phone},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result[0].id })
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const result = await sql`
      DELETE FROM employees 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
