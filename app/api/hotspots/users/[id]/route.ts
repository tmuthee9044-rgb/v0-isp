import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const user = await sql`
      SELECT 
        hu.*,
        h.name as hotspot_name,
        h.location as hotspot_location
      FROM hotspot_users hu
      JOIN hotspots h ON hu.hotspot_id = h.id
      WHERE hu.id = ${id}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Hotspot user not found" }, { status: 404 })
    }

    return NextResponse.json(user[0])
  } catch (error) {
    console.error("Error fetching hotspot user:", error)
    return NextResponse.json({ error: "Failed to fetch hotspot user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await request.json()

    const { username, password, email, phone, time_limit, data_limit, status } = body

    const result = await sql`
      UPDATE hotspot_users 
      SET 
        username = ${username},
        password = ${password},
        email = ${email},
        phone = ${phone},
        time_limit = ${time_limit},
        data_limit = ${data_limit},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Hotspot user not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result[0].id })
  } catch (error) {
    console.error("Error updating hotspot user:", error)
    return NextResponse.json({ error: "Failed to update hotspot user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    // First disconnect any active sessions
    await sql`
      UPDATE hotspot_sessions 
      SET status = 'disconnected', disconnected_at = NOW()
      WHERE user_id = ${id} AND status = 'active'
    `

    const result = await sql`
      DELETE FROM hotspot_users 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Hotspot user not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Hotspot user deleted successfully" })
  } catch (error) {
    console.error("Error deleting hotspot user:", error)
    return NextResponse.json({ error: "Failed to delete hotspot user" }, { status: 500 })
  }
}
