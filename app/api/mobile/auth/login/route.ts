import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "isp-mobile-secret-change-in-production"
const JWT_EXPIRES_IN = "30d" // 30 days for mobile apps

/**
 * Customer Mobile App Login
 * POST /api/mobile/auth/login
 * Body: { email, password, deviceId, deviceType, deviceName, fcmToken }
 */
export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const { email, password, deviceId, deviceType, deviceName, fcmToken } = body

    if (!email || !password || !deviceId) {
      return NextResponse.json(
        { error: "Email, password, and device ID required" },
        { status: 400 }
      )
    }

    // Find customer by email
    const customers = await sql`
      SELECT id, email, name, phone, password_hash, status
      FROM customers
      WHERE email = ${email}
      LIMIT 1
    `

    if (customers.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    const customer = customers[0]

    // Check if customer is active
    if (customer.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      )
    }

    // Verify password (if password_hash exists)
    if (customer.password_hash) {
      const isValid = await bcrypt.compare(password, customer.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        )
      }
    } else {
      // First login - set password
      const hash = await bcrypt.hash(password, 10)
      await sql`
        UPDATE customers
        SET password_hash = ${hash}
        WHERE id = ${customer.id}
      `
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        customerId: customer.id,
        email: customer.email,
        type: "mobile",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    const tokenHash = await bcrypt.hash(token, 10)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Store or update session
    await sql`
      INSERT INTO customer_app_sessions (
        customer_id, device_id, device_type, device_name, 
        fcm_token, jwt_token_hash, ip_address, expires_at
      ) VALUES (
        ${customer.id}, ${deviceId}, ${deviceType || "unknown"}, ${deviceName || "Mobile Device"},
        ${fcmToken || null}, ${tokenHash}, ${request.headers.get("x-forwarded-for") || "unknown"},
        ${expiresAt.toISOString()}
      )
      ON CONFLICT (customer_id, device_id) 
      DO UPDATE SET
        fcm_token = EXCLUDED.fcm_token,
        jwt_token_hash = EXCLUDED.jwt_token_hash,
        device_type = EXCLUDED.device_type,
        device_name = EXCLUDED.device_name,
        last_active = CURRENT_TIMESTAMP,
        expires_at = EXCLUDED.expires_at
    `

    // Get customer services
    const services = await sql`
      SELECT 
        cs.id, cs.service_plan_id, cs.status, cs.portal_username,
        cs.download_speed, cs.upload_speed, cs.ip_address,
        sp.name as plan_name, sp.price
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customer.id}
      ORDER BY cs.created_at DESC
    `

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      services,
    })
  } catch (error) {
    console.error("[v0] Mobile login error:", error)
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
