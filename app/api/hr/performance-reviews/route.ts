import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const reviews = await sql`
      SELECT 
        pr.*,
        e.first_name,
        e.last_name,
        e.employee_id,
        e.position
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      ORDER BY pr.review_date DESC
      LIMIT 100
    `

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error("Error fetching performance reviews:", error)
    return NextResponse.json({ reviews: [] })
  }
}
