import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  const sql = await getSql()
  try {
    const customers = await sql`
      SELECT 
        id,
        account_number,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        service_preferences,
        created_at
      FROM customers 
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("[v0] Error fetching pending customers:", error)
    return NextResponse.json({ error: "Failed to fetch pending customers" }, { status: 500 })
  }
}
