import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseConnection() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.NEON_DATABASE_URL

  console.log("[v0] Database connection attempt:", {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
    selectedUrl: dbUrl ? `${dbUrl.substring(0, 30)}...` : "none",
  })

  if (!dbUrl) {
    throw new Error("No database connection string found")
  }

  return neon(dbUrl)
}

export async function GET() {
  try {
    const sql = getDatabaseConnection()

    console.log("[v0] Fetching employees from database...")

    const employees = await sql`
      SELECT 
        id, employee_id, first_name, last_name, 
        email, phone, position, department, hire_date, salary, status, created_at
      FROM employees 
      ORDER BY created_at DESC
    `

    console.log("[v0] Successfully fetched", employees.length, "employees")

    return NextResponse.json({
      success: true,
      employees: employees,
    })
  } catch (error) {
    console.error("[v0] Error fetching employees:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employees",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDatabaseConnection()

    const contentType = request.headers.get("content-type")
    let data: any

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries())
    } else {
      data = await request.json()
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      basicSalary,
      employeeId,
      startDate,
      createUserAccount,
      userRole,
    } = data

    // Generate employee ID if not provided
    const finalEmployeeId = employeeId || `EMP${Date.now().toString().slice(-6)}`

    const result = await sql`
      INSERT INTO employees (
        employee_id, first_name, last_name, email, phone, position,
        department, salary, hire_date, status, created_at
      ) VALUES (
        ${finalEmployeeId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${position},
        ${department}, ${Number.parseFloat(basicSalary) || 0}, 
        ${startDate ? new Date(startDate).toISOString() : new Date().toISOString()},
        'active', NOW()
      )
      RETURNING *
    `

    // Create user account if requested
    if (createUserAccount === "true" || createUserAccount === true) {
      try {
        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${email}
        `

        if (existingUser.length === 0) {
          const username = `${firstName?.toLowerCase()}.${lastName?.toLowerCase()}`
          const tempPassword = "temp_password_hash" // This should be properly hashed in production

          await sql`
            INSERT INTO users (username, email, password_hash, role, status, created_at)
            VALUES (${username}, ${email}, ${tempPassword}, ${userRole || "employee"}, 'active', NOW())
          `
          console.log(`[v0] User account created for ${email}`)
        } else {
          console.log(`[v0] User account already exists for ${email}, skipping creation`)
        }
      } catch (userError) {
        console.error("Error creating user account:", userError)
        // Continue even if user creation fails - don't fail the entire employee creation
      }
    }

    return NextResponse.json({
      success: true,
      message: "Employee created successfully",
      data: result[0],
    })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create employee",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
