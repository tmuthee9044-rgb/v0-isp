import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching users from database...")

    const users = await sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.status,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `

    console.log(`[v0] Found ${users.length} users`)

    const roleStats = await sql`
      SELECT 
        role,
        COUNT(*) as user_count
      FROM users
      WHERE status = 'active'
      GROUP BY role
    `

    const roles = [
      {
        name: "Administrator",
        description: "Full system access and user management",
        permissions: ["All Permissions"],
        userCount: roleStats.find((r) => r.role === "administrator")?.user_count || 0,
      },
      {
        name: "Manager",
        description: "Manage customers, billing, and reports",
        permissions: ["Customer Management", "Billing", "Reports"],
        userCount: roleStats.find((r) => r.role === "manager")?.user_count || 0,
      },
      {
        name: "Technician",
        description: "Network operations and technical support",
        permissions: ["Network Management", "Support Tickets"],
        userCount: roleStats.find((r) => r.role === "technician")?.user_count || 0,
      },
      {
        name: "Accountant",
        description: "Financial management and reporting",
        permissions: ["Billing", "Financial Reports", "Payments"],
        userCount: roleStats.find((r) => r.role === "accountant")?.user_count || 0,
      },
    ]

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        department: "N/A",
        status: user.status,
        lastLogin: "N/A",
        employeeId: user.id,
      })),
      roles: roles,
    })
  } catch (error) {
    console.error("[v0] Error fetching user management data:", error)
    return NextResponse.json({ error: "Failed to fetch user management data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    console.log(`[v0] User management action: ${action}`)

    if (action === "create_user") {
      const { username, email, role, password } = data

      const passwordHash = `hash_${password}_${Date.now()}`

      const result = await sql`
        INSERT INTO users (username, email, role, password_hash, status, created_at)
        VALUES (${username}, ${email}, ${role.toLowerCase()}, ${passwordHash}, 'active', NOW())
        RETURNING id, username, email, role
      `

      console.log(`[v0] Created user: ${result[0].username}`)

      return NextResponse.json({ success: true, user: result[0] })
    }

    if (action === "create_role") {
      console.log(`[v0] Role creation requested: ${data.name}`)
      return NextResponse.json({ success: true, message: "Roles are predefined in the system" })
    }

    if (action === "update_settings") {
      const settings = data

      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, created_at)
          VALUES (${`user_management.${key}`}, ${JSON.stringify(value)}, NOW())
        `
      }

      console.log(`[v0] Updated ${Object.keys(settings).length} settings`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error in user management operation:", error)
    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  }
}
