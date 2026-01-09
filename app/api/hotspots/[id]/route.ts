import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const hotspot = await sql`
      SELECT 
        h.*,
        COUNT(DISTINCT hu.id) as total_users,
        COUNT(DISTINCT CASE WHEN hs.status = 'active' THEN hs.id END) as active_sessions
      FROM hotspots h
      LEFT JOIN hotspot_users hu ON h.id = hu.hotspot_id AND hu.status = 'active'
      LEFT JOIN hotspot_sessions hs ON h.id = hs.hotspot_id AND hs.status = 'active'
      WHERE h.id = ${id}
      GROUP BY h.id
    `

    if (hotspot.length === 0) {
      return NextResponse.json({ error: "Hotspot not found" }, { status: 404 })
    }

    return NextResponse.json(hotspot[0])
  } catch (error) {
    console.error("Error fetching hotspot:", error)
    return NextResponse.json({ error: "Failed to fetch hotspot" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await request.json()

    const {
      name,
      location,
      address,
      latitude,
      longitude,
      ssid,
      password,
      security_type,
      bandwidth_limit,
      user_limit,
      device_mac,
      device_model,
      ip_address,
      status,
    } = body

    const result = await sql`
      UPDATE hotspots 
      SET 
        name = ${name},
        location = ${location},
        address = ${address},
        latitude = ${latitude},
        longitude = ${longitude},
        ssid = ${ssid},
        password = ${password},
        security_type = ${security_type},
        bandwidth_limit = ${bandwidth_limit},
        user_limit = ${user_limit},
        device_mac = ${device_mac},
        device_model = ${device_model},
        ip_address = ${ip_address},
        status = ${status || "active"},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Hotspot not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result[0].id })
  } catch (error) {
    console.error("Error updating hotspot:", error)
    return NextResponse.json({ error: "Failed to update hotspot" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    // Check if hotspot has active users or sessions
    const activeConnections = await sql`
      SELECT COUNT(*) as count
      FROM hotspot_users hu
      WHERE hu.hotspot_id = ${id} AND hu.status = 'active'
    `

    if (Number(activeConnections[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete hotspot with active users. Please disconnect all users first." },
        { status: 400 },
      )
    }

    const result = await sql`
      DELETE FROM hotspots 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Hotspot not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Hotspot deleted successfully" })
  } catch (error) {
    console.error("Error deleting hotspot:", error)
    return NextResponse.json({ error: "Failed to delete hotspot" }, { status: 500 })
  }
}
