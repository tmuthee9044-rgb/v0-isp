import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching roles with permissions...")

    // Fetch all roles with their permission counts
    const roles = await sql`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system_role,
        r.created_at,
        COUNT(DISTINCT rp.permission_id) as permission_count,
        COUNT(DISTINCT u.id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN users u ON u.role = r.name
      GROUP BY r.id, r.name, r.description, r.is_system_role, r.created_at
      ORDER BY r.name
    `

    // Fetch all permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await sql`
          SELECT p.id, p.module, p.permission_key, p.permission_name, p.description
          FROM permissions p
          INNER JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = ${role.id}
          ORDER BY p.module, p.permission_name
        `

        return {
          ...role,
          permissions: permissions.map((p) => p.permission_key),
          permissionDetails: permissions,
        }
      }),
    )

    console.log("[v0] Roles fetched successfully:", rolesWithPermissions.length)

    return NextResponse.json({
      success: true,
      roles: rolesWithPermissions,
    })
  } catch (error) {
    console.error("[v0] Error fetching roles:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch roles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, permissions } = body

    console.log("[v0] Creating new role:", name)

    // Create the role
    const [newRole] = await sql`
      INSERT INTO roles (name, description, is_system_role)
      VALUES (${name}, ${description}, FALSE)
      RETURNING id, name, description, is_system_role, created_at
    `

    // Assign permissions to the role
    if (permissions && permissions.length > 0) {
      for (const permissionKey of permissions) {
        await sql`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT ${newRole.id}, id
          FROM permissions
          WHERE permission_key = ${permissionKey}
          ON CONFLICT DO NOTHING
        `
      }
    }

    console.log("[v0] Role created successfully:", newRole.id)

    return NextResponse.json({
      success: true,
      role: newRole,
    })
  } catch (error) {
    console.error("[v0] Error creating role:", error)
    return NextResponse.json({ success: false, error: "Failed to create role" }, { status: 500 })
  }
}
