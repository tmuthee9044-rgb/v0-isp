import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db" // Fixed import path from @/lib/database to @/lib/db

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
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
    const sql = await getSql()
    const id = Number(params.id)

    let body: any
    const contentType = request.headers.get("content-type")

    try {
      if (contentType?.includes("application/json")) {
        body = await request.json()
      } else {
        // Handle FormData
        const formData = await request.formData()
        body = Object.fromEntries(formData.entries())
      }
    } catch (parseError) {
      console.error("[v0] Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request body format" }, { status: 400 })
    }

    console.log("[v0] Received employee update data:", body)

    const {
      first_name,
      firstName,
      last_name,
      lastName,
      email,
      phone,
      department_id,
      department,
      role_id,
      salary,
      basicSalary,
      hire_date,
      startDate,
      status,
      address,
      emergency_contact_name,
      emergencyContact,
      emergency_contact_phone,
      emergencyPhone,
    } = body

    const finalFirstName = first_name || firstName
    const finalLastName = last_name || lastName
    const finalEmergencyName = emergency_contact_name || emergencyContact
    const finalEmergencyPhone = emergency_contact_phone || emergencyPhone
    const finalHireDate = hire_date || startDate
    const finalSalary = salary || basicSalary
    const finalDepartmentId = department_id || department

    const parsedDepartmentId =
      finalDepartmentId && String(finalDepartmentId).trim() !== "" ? Number(finalDepartmentId) : null
    const parsedRoleId = role_id && String(role_id).trim() !== "" ? Number(role_id) : null
    const parsedSalary =
      finalSalary && String(finalSalary).trim() !== "" && String(finalSalary) !== "-" ? Number(finalSalary) : null

    if (finalDepartmentId && (isNaN(parsedDepartmentId!) || parsedDepartmentId === null)) {
      console.error("[v0] Invalid department_id:", finalDepartmentId)
      return NextResponse.json({ error: "Invalid department_id" }, { status: 400 })
    }
    if (role_id && (isNaN(parsedRoleId!) || parsedRoleId === null)) {
      console.error("[v0] Invalid role_id:", role_id)
      return NextResponse.json({ error: "Invalid role_id" }, { status: 400 })
    }
    if (finalSalary && (isNaN(parsedSalary!) || parsedSalary === null)) {
      console.error("[v0] Invalid salary:", finalSalary)
      return NextResponse.json({ error: "Invalid salary value" }, { status: 400 })
    }

    console.log("[v0] Updating employee with parsed values:", {
      finalFirstName,
      finalLastName,
      parsedDepartmentId,
      parsedRoleId,
      parsedSalary,
    })

    const result = await sql`
      UPDATE employees 
      SET 
        first_name = ${finalFirstName},
        last_name = ${finalLastName},
        email = ${email},
        phone = ${phone},
        department_id = ${parsedDepartmentId},
        role_id = ${parsedRoleId},
        salary = ${parsedSalary},
        hire_date = ${finalHireDate},
        status = ${status || "active"},
        address = ${address},
        emergency_contact_name = ${finalEmergencyName},
        emergency_contact_phone = ${finalEmergencyPhone},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    console.log("[v0] Employee updated successfully:", result[0].id)
    return NextResponse.json({ success: true, id: result[0].id })
  } catch (error) {
    console.error("[v0] Error updating employee:", error)
    return NextResponse.json(
      {
        error: "Failed to update employee",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
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
