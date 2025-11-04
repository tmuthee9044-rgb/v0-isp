import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    console.log(`[v0] Employee sync action: ${action}`)

    if (action === "sync_all") {
      const employeesWithoutUsers = await sql`
        SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.phone, e.position, e.department
        FROM employees e
        WHERE e.status = 'active' 
        AND e.email NOT IN (SELECT email FROM users WHERE email IS NOT NULL)
      `

      console.log(`[v0] Found ${employeesWithoutUsers.length} employees without user accounts`)

      const createdUsers = []

      for (const employee of employeesWithoutUsers) {
        // Determine default role based on position/department
        let defaultRole = "employee"
        const position = employee.position?.toLowerCase() || ""
        const department = employee.department?.toLowerCase() || ""

        if (position.includes("manager") || position.includes("supervisor")) {
          defaultRole = "manager"
        } else if (position.includes("technician") || department.includes("technical")) {
          defaultRole = "technician"
        } else if (position.includes("accountant") || department.includes("finance")) {
          defaultRole = "accountant"
        } else if (position.includes("admin") || position.includes("administrator")) {
          defaultRole = "administrator"
        }

        // Generate username (firstname.lastname format)
        const username = `${employee.first_name?.toLowerCase() || "user"}.${employee.last_name?.toLowerCase() || employee.employee_id}`

        const tempPassword = `temp_${employee.employee_id}_${Date.now()}`

        const newUser = await sql`
          INSERT INTO users (username, email, password_hash, role, status, created_at)
          VALUES (
            ${username},
            ${employee.email},
            ${tempPassword},
            ${defaultRole},
            'active',
            NOW()
          )
          RETURNING id, username, email, role
        `

        createdUsers.push({
          employeeId: employee.employee_id,
          name: `${employee.first_name} ${employee.last_name}`,
          username: username,
          email: employee.email,
          role: defaultRole,
          userId: newUser[0].id,
        })
      }

      console.log(`[v0] Created ${createdUsers.length} user accounts`)

      return NextResponse.json({
        success: true,
        message: `Successfully created ${createdUsers.length} user accounts`,
        data: createdUsers,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Error syncing employees:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync employees",
      },
      { status: 500 },
    )
  }
}
