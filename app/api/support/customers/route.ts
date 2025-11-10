import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    const customers = await sql`
      SELECT 
        id,
        first_name || ' ' || last_name as name,
        email,
        phone
      FROM customers
      WHERE status = 'active'
      ORDER BY first_name, last_name
    `

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
