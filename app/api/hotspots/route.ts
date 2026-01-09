import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const hotspots = await sql`
      SELECT 
        h.*,
        COUNT(DISTINCT hu.id) as total_users,
        COUNT(DISTINCT CASE WHEN hs.status = 'active' THEN hs.id END) as active_sessions
      FROM hotspots h
      LEFT JOIN hotspot_users hu ON h.id = hu.hotspot_id AND hu.status = 'active'
      LEFT JOIN hotspot_sessions hs ON h.id = hs.hotspot_id AND hs.status = 'active'
      GROUP BY h.id
      ORDER BY h.created_at DESC
    `

    return NextResponse.json(hotspots)
  } catch (error) {
    console.error("Error fetching hotspots:", error)
    return NextResponse.json({ error: "Failed to fetch hotspots" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const result = await sql`
      INSERT INTO hotspots (
        name, location, address, latitude, longitude, ssid, password,
        security_type, bandwidth_limit, user_limit, device_mac,
        device_model, ip_address, status
      ) VALUES (
        ${data.name}, ${data.location}, ${data.address}, ${data.latitude},
        ${data.longitude}, ${data.ssid}, ${data.password}, ${data.security_type},
        ${data.bandwidth_limit}, ${data.user_limit}, ${data.device_mac},
        ${data.device_model}, ${data.ip_address}, 'active'
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating hotspot:", error)
    return NextResponse.json({ error: "Failed to create hotspot" }, { status: 500 })
  }
}
