import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Log authentication attempt
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const session = await AuthService.authenticateUser(email, password)

    if (!session) {
      // Log failed login
      await sql`
        INSERT INTO auth_logs (email, action, ip_address, user_agent, success, failure_reason, created_at)
        VALUES (${email}, 'login', ${clientIP}, ${userAgent}, FALSE, 'Invalid credentials', NOW())
      `

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Log successful login
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

    // Set secure HTTP-only cookie
    response.cookies.set("auth-token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
