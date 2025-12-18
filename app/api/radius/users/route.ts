import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

// GET - List RADIUS users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get("customer_id")
    const status = searchParams.get("status")

    let query = `
      SELECT 
        ru.*,
        c.full_name as customer_name,
        c.email,
        COUNT(rsa.id) as active_sessions
      FROM radius_users ru
      LEFT JOIN customers c ON ru.customer_id = c.id
      LEFT JOIN radius_sessions_active rsa ON ru.id = rsa.user_id
    `

    const conditions = []
    if (customer_id) conditions.push(`ru.customer_id = ${customer_id}`)
    if (status) conditions.push(`ru.status = '${status}'`)

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
    }

    query += ` GROUP BY ru.id, c.full_name, c.email ORDER BY ru.created_at DESC LIMIT 100`

    const users = await sql(query)

    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Error fetching RADIUS users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create RADIUS user
export async function POST(request: NextRequest) {
  try {
    const {
      username,
      password,
      customer_id,
      service_id,
      ip_address,
      ip_pool,
      download_limit,
      upload_limit,
      session_timeout,
      idle_timeout,
      simultaneous_use = 1,
      fup_limit,
      expiry_date,
    } = await request.json()

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    const result = await sql`
      INSERT INTO radius_users (
        username, password_hash, customer_id, service_id, status,
        ip_address, ip_pool, download_limit, upload_limit,
        session_timeout, idle_timeout, simultaneous_use,
        fup_limit, expiry_date, created_at, updated_at
      ) VALUES (
        ${username}, ${password_hash}, ${customer_id}, ${service_id}, 'active',
        ${ip_address}, ${ip_pool}, ${download_limit}, ${upload_limit},
        ${session_timeout}, ${idle_timeout}, ${simultaneous_use},
        ${fup_limit}, ${expiry_date}, NOW(), NOW()
      )
      RETURNING *
    `

    // Log creation
    await sql`
      INSERT INTO system_logs (source, level, message, user_id, created_at)
      VALUES ('RADIUS', 'INFO', ${`Created RADIUS user: ${username}`}, ${customer_id}, NOW())
    `

    return NextResponse.json({ user: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating RADIUS user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
