import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { action, data } = body
    const userId = params.id

    console.log(`[v0] Updating user ${userId}, action: ${action}`)

    if (action === "update_user") {
      const { email, role, status } = data

      await sql`
        UPDATE users 
        SET 
          email = ${email}, 
          role = ${role.toLowerCase()}, 
          status = ${status}
        WHERE id = ${userId}
      `

      console.log(`[v0] User ${userId} updated successfully`)

      return NextResponse.json({ success: true })
    }

    if (action === "reset_password") {
      const { newPassword } = data

      const passwordHash = `hash_${newPassword}_${Date.now()}`

      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}
        WHERE id = ${userId}
      `

      console.log(`[v0] Password reset for user ${userId}`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    console.log(`[v0] Deleting user ${userId}`)

    await sql`
      UPDATE users 
      SET status = 'inactive'
      WHERE id = ${userId}
    `

    console.log(`[v0] User ${userId} deleted (set to inactive)`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
