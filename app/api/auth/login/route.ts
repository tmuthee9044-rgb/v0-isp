import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const session = await AuthService.authenticateUser(email, password)

    if (!session) {
      await sql`
        INSERT INTO auth_logs (email, action, ip_address, user_agent, success, failure_reason, created_at)
        VALUES (${email}, 'login', ${clientIP}, ${userAgent}, FALSE, 'Invalid credentials', NOW())
      `

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    await sql`
      INSERT INTO auth_logs (user_id, email, action, ip_address, user_agent, success, created_at)
      VALUES (${session.user.id}, ${email}, 'login', ${clientIP}, ${userAgent}, TRUE, NOW())
    `

    const response = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: `${session.user.first_name || ""} ${session.user.last_name || ""}`.trim() || session.user.username,
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions,
        department: session.user.department,
      },
    })

    response.cookies.set("auth-token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
