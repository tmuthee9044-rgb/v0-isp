import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    const employees = await sql`
      SELECT 
        id,
        first_name || ' ' || last_name as name,
        department,
        position
      FROM employees
      WHERE status = 'active'
      AND department IN ('Support', 'Technical', 'Customer Service')
      ORDER BY first_name, last_name
    `

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}
