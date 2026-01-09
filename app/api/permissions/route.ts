import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching all permissions...")

    // Fetch all permissions grouped by module
    const permissions = await sql`
      SELECT 
        id,
        module,
        permission_key,
        permission_name,
        description
      FROM permissions
      ORDER BY module, permission_name
    `

    // Group permissions by module
    const groupedPermissions = permissions.reduce((acc: any, permission: any) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    }, {})

    console.log("[v0] Permissions fetched successfully:", permissions.length)

    return NextResponse.json({
      success: true,
      permissions: groupedPermissions,
      allPermissions: permissions,
    })
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch permissions" }, { status: 500 })
  }
}
