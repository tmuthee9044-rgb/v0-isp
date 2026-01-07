import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching employees...")
    const sql = await getSql()

    const employees = await sql`
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        position,
        department,
        hire_date,
        status,
        basic_salary
      FROM employees
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, employees })
  } catch (error: any) {
    console.error("[v0] Error fetching employees:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Creating employee:", body)

    const sql = await getSql()

    const employeeId = `EMP-${Date.now()}`

    const result = await sql`
      INSERT INTO employees (
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        position,
        department,
        hire_date,
        employment_type,
        status,
        basic_salary,
        national_id,
        kra_pin,
        nssf_number,
        nhif_number,
        bank_name,
        bank_account,
        emergency_contact_name,
        emergency_contact_phone,
        address,
        city,
        created_at,
        updated_at
      ) VALUES (
        ${employeeId},
        ${body.firstName || body.first_name},
        ${body.lastName || body.last_name},
        ${body.email},
        ${body.phone || null},
        ${body.position || null},
        ${body.department || null},
        ${body.hireDate || body.hire_date || new Date().toISOString()},
        ${body.employmentType || body.employment_type || "full-time"},
        ${body.status || "active"},
        ${body.basicSalary || body.basic_salary || 0},
        ${body.nationalId || body.national_id || null},
        ${body.kraPin || body.kra_pin || null},
        ${body.nssfNumber || body.nssf_number || null},
        ${body.nhifNumber || body.nhif_number || null},
        ${body.bankName || body.bank_name || null},
        ${body.bankAccount || body.bank_account || null},
        ${body.emergencyContactName || body.emergency_contact_name || null},
        ${body.emergencyContactPhone || body.emergency_contact_phone || null},
        ${body.address || null},
        ${body.city || null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `

    console.log("[v0] Employee created successfully:", result[0])

    return NextResponse.json({ success: true, employee: result[0] })
  } catch (error: any) {
    console.error("[v0] Error creating employee:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create employee" }, { status: 500 })
  }
}
