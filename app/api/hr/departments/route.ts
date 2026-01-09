import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    console.log("[v0] Fetching department statistics from database...")

    const departments = await sql`
      SELECT 
        department,
        COUNT(*) as employee_count
      FROM employees
      WHERE status = 'active' AND department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY employee_count DESC
    `

    console.log("[v0] Successfully fetched", departments.length, "departments")

    return NextResponse.json({
      success: true,
      departments: departments,
    })
  } catch (error) {
    console.error("[v0] Error fetching departments:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch departments",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
