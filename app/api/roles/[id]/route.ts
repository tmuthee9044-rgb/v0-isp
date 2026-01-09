import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleId = params.id
    const body = await request.json()
    const { name, description, permissions } = body

    console.log("[v0] Updating role:", roleId)

    // Check if role is a system role
    const [role] = await sql`
      SELECT is_system_role FROM roles WHERE id = ${roleId}
    `

    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 })
    }

    // Update role details (only if not a system role or only updating permissions)
    if (!role.is_system_role && name && description) {
      await sql`
        UPDATE roles
        SET name = ${name}, description = ${description}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${roleId}
      `
    }

    // Update permissions
    if (permissions) {
      // Remove all existing permissions
      await sql`
        DELETE FROM role_permissions WHERE role_id = ${roleId}
      `

      // Add new permissions
      for (const permissionKey of permissions) {
        await sql`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT ${roleId}, id
          FROM permissions
          WHERE permission_key = ${permissionKey}
          ON CONFLICT DO NOTHING
        `
      }
    }

    console.log("[v0] Role updated successfully")

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
    })
  } catch (error) {
    console.error("[v0] Error updating role:", error)
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleId = params.id

    console.log("[v0] Deleting role:", roleId)

    // Check if role is a system role
    const [role] = await sql`
      SELECT is_system_role FROM roles WHERE id = ${roleId}
    `

    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 })
    }

    if (role.is_system_role) {
      return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 400 })
    }

    // Check if any users are assigned to this role
    const users = await sql`
      SELECT COUNT(*) as count FROM users WHERE role_id = ${roleId}
    `

    if (users[0].count > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete role with assigned users" }, { status: 400 })
    }

    // Delete the role (cascade will delete role_permissions)
    await sql`
      DELETE FROM roles WHERE id = ${roleId}
    `

    console.log("[v0] Role deleted successfully")

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting role:", error)
    return NextResponse.json({ success: false, error: "Failed to delete role" }, { status: 500 })
  }
}
