import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const locations = await sql`
      SELECT * FROM locations 
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      locations: locations,
    })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch locations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, address, city, region, description, status } = await request.json()

    const result = await sql`
      INSERT INTO locations (name, address, city, region, description, status)
      VALUES (${name}, ${address || null}, ${city || null}, ${region || null}, ${description || null}, ${status || "active"})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      location: result[0],
    })
  } catch (error) {
    console.error("Error creating location:", error)
    return NextResponse.json({ success: false, error: "Failed to create location" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, address, city, region, description, status } = await request.json()

    const result = await sql`
      UPDATE locations 
      SET name = ${name}, 
          address = ${address || null}, 
          city = ${city || null}, 
          region = ${region || null}, 
          description = ${description || null}, 
          status = ${status || "active"},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      location: result[0],
    })
  } catch (error) {
    console.error("Error updating location:", error)
    return NextResponse.json({ success: false, error: "Failed to update location" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "Location ID is required" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM locations 
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting location:", error)
    return NextResponse.json({ success: false, error: "Failed to delete location" }, { status: 500 })
  }
}
