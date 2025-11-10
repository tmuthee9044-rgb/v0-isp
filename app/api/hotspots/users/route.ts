import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const users = await sql`
      SELECT 
        u.*,
        h.name as hotspot_name,
        h.location as hotspot_location,
        COUNT(s.id) as total_sessions,
        MAX(s.start_time) as last_session,
        COALESCE(SUM(s.data_used), 0) as data_used
      FROM hotspot_users u
      LEFT JOIN hotspots h ON u.hotspot_id = h.id
      LEFT JOIN hotspot_sessions s ON u.id = s.user_id
      GROUP BY u.id, h.name, h.location
      ORDER BY u.created_at DESC
    `

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { hotspot_id, username, password, email, phone, time_limit, data_limit, expiry_days } = data

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiry_days)

    const result = await sql`
      INSERT INTO hotspot_users (
        hotspot_id, username, password, email, phone, time_limit, data_limit, expiry_date, status
      ) VALUES (
        ${hotspot_id}, ${username}, ${password}, ${email}, ${phone}, ${time_limit}, ${data_limit}, ${expiryDate.toISOString()}, 'active'
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
