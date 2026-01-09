import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { fileData, columnMapping } = await request.json()

    if (!fileData || !columnMapping) {
      return NextResponse.json({ error: "Missing file data or column mapping" }, { status: 400 })
    }

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < fileData.rows.length; i++) {
      const row = fileData.rows[i]

      try {
        // Map row data to employee fields
        const employeeData: any = {}

        Object.entries(columnMapping).forEach(([employeeField, fileColumn]) => {
          if (fileColumn) {
            const columnIndex = fileData.headers.indexOf(fileColumn as string)
            if (columnIndex !== -1) {
              employeeData[employeeField] = row[columnIndex] || null
            }
          }
        })

        // Validate required fields
        if (!employeeData.first_name || !employeeData.last_name || !employeeData.email || !employeeData.employee_id) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Check for duplicate employee ID or email
        const existingEmployee = await sql`
          SELECT id FROM employees WHERE employee_id = ${employeeData.employee_id} OR email = ${employeeData.email}
        `

        if (existingEmployee.length > 0) {
          errors.push(
            `Row ${i + 1}: Employee ID ${employeeData.employee_id} or email ${employeeData.email} already exists`,
          )
          continue
        }

        // Convert numeric fields
        const salary = employeeData.salary ? Number.parseFloat(employeeData.salary) : null

        // Insert employee
        await sql`
          INSERT INTO employees (
            employee_id, first_name, last_name, email, phone, department,
            position, hire_date, salary, manager, status, created_at, updated_at
          ) VALUES (
            ${employeeData.employee_id}, ${employeeData.first_name}, ${employeeData.last_name},
            ${employeeData.email}, ${employeeData.phone}, ${employeeData.department},
            ${employeeData.position}, ${employeeData.hire_date}, ${salary},
            ${employeeData.manager}, ${employeeData.status || "active"},
            NOW(), NOW()
          )
        `

        imported++
      } catch (error) {
        console.error(`Error importing employee row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed"}`)
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: fileData.rows.length,
      message: `Successfully imported ${imported} employees`,
    })
  } catch (error) {
    console.error("Employee import processing error:", error)
    return NextResponse.json({ error: "Failed to process employee import" }, { status: 500 })
  }
}
