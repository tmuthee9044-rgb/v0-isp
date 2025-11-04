import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { loginId, password, loginMethod } = await request.json()

    let customer

    if (loginMethod === "email") {
      // Login with email
      customer = await sql`
        SELECT id, name, email, phone, status, portal_username, portal_password
        FROM customers 
        WHERE email = ${loginId} AND status = 'active'
        LIMIT 1
      `
    } else {
      // Login with account number or portal login ID
      customer = await sql`
        SELECT id, name, email, phone, status, portal_username, portal_password
        FROM customers 
        WHERE (portal_login_id = ${loginId} OR portal_username = ${loginId}) 
        AND status = 'active'
        LIMIT 1
      `
    }

    if (!customer.length) {
      return NextResponse.json({ error: "Invalid credentials or account not found" }, { status: 401 })
    }

    const customerData = customer[0]

    // In a real implementation, you'd verify the hashed password
    // For now, we'll do a simple comparison (should be bcrypt.compare in production)
    if (customerData.portal_password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create session token (in production, use JWT or proper session management)
    const sessionToken = `portal_${customerData.id}_${Date.now()}`

    // Set authentication cookie
    const response = NextResponse.json({
      success: true,
      customer: {
        id: customerData.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        status: customerData.status,
      },
      redirectUrl: `/portal/customer/${customerData.id}`,
    })

    response.cookies.set("portal-auth-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    response.cookies.set("portal-customer-id", customerData.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("[v0] Portal login error:", error)
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}
