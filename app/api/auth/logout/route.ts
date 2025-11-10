import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (token) {
      await AuthService.logout(token)

      // Log logout
      const user = await AuthService.getCurrentUser()
      if (user) {
        await sql`
          INSERT INTO auth_logs (user_id, email, action, success, created_at)
          VALUES (${user.id}, ${user.email}, 'logout', TRUE, NOW())
        `
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("auth-token")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
