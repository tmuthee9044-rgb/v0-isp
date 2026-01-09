import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"

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

  return getSql()
}

export async function GET() {
  try {
    const sql = await getSql()

    console.log("[v0] Fetching employees from database...")

    const employees = await sql`
      SELECT 
        id, employee_id, first_name, last_name, 
        email, phone, position, department, 
        hire_date, salary, status, created_at
      FROM employees 
      ORDER BY created_at DESC
      LIMIT 500
    `

    console.log("[v0] Successfully fetched", employees.length, "employees")

    return NextResponse.json({
      success: true,
      employees: employees,
      count: employees.length,
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
    const sql = await getSql()

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
      nationalId,
      dateOfBirth,
      gender,
      maritalStatus,
      address,
      emergencyContact,
      emergencyPhone,
      employeeId,
      position,
      department,
      reportingManager,
      employmentType,
      contractType,
      startDate,
      probationPeriod,
      workLocation,
      basicSalary,
      allowances,
      benefits,
      payrollFrequency,
      bankName,
      bankAccount,
      kraPin,
      nssfNumber,
      shaNumber,
      portalUsername,
      portalPassword,
      qualifications,
      experience,
      skills,
      notes,
      photoUrl,
      createUserAccount,
      userRole,
    } = data

    const existingEmployee = await sql`
      SELECT id, employee_id, first_name, last_name 
      FROM employees 
      WHERE email = ${email}
    `

    if (existingEmployee.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `An employee with email ${email} already exists (${existingEmployee[0].first_name} ${existingEmployee[0].last_name} - ${existingEmployee[0].employee_id})`,
          error: "DUPLICATE_EMAIL",
        },
        { status: 409 }, // 409 Conflict status code
      )
    }

    const finalEmployeeId = employeeId || `EMP${Date.now().toString().slice(-6)}`

    const result = await sql`
      INSERT INTO employees (
        employee_id, first_name, last_name, email, phone, national_id,
        date_of_birth, gender, marital_status, address, emergency_contact,
        emergency_phone, position, department, reporting_manager, employment_type,
        contract_type, hire_date, probation_period, work_location, salary,
        allowances, benefits, payroll_frequency, bank_name, bank_account,
        kra_pin, nssf_number, sha_number, portal_username, portal_password,
        qualifications, experience, skills, notes, photo_url, status, created_at
      ) VALUES (
        ${finalEmployeeId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${nationalId},
        ${dateOfBirth ? new Date(dateOfBirth).toISOString() : null}, ${gender}, 
        ${maritalStatus}, ${address}, ${emergencyContact}, ${emergencyPhone},
        ${position}, ${department}, ${reportingManager}, ${employmentType},
        ${contractType}, ${startDate ? new Date(startDate).toISOString() : new Date().toISOString()},
        ${probationPeriod ? Number.parseInt(probationPeriod) : null}, ${workLocation},
        ${basicSalary ? Number.parseFloat(basicSalary) : 0}, 
        ${allowances ? Number.parseFloat(allowances) : 0}, ${benefits},
        ${payrollFrequency || "monthly"}, ${bankName}, ${bankAccount},
        ${kraPin}, ${nssfNumber}, ${shaNumber}, ${portalUsername},
        ${portalPassword}, ${qualifications}, ${experience}, ${skills},
        ${notes}, ${photoUrl}, 'active', NOW()
      )
      RETURNING *
    `

    await sql`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (
        0, 'create', 'employee', ${result[0].id}, 
        ${JSON.stringify({ employee_id: finalEmployeeId, name: `${firstName} ${lastName}`, position, department })},
        NOW()
      )
    `

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
