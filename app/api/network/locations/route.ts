import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const locations = await sql`
      SELECT 
        id,
        name,
        address,
        city,
        region,
        status,
        description,
        created_at
      FROM locations
      WHERE status = 'active'
      ORDER BY name ASC
    `

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ message: "Failed to fetch locations" }, { status: 500 })
  }
}
