import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const reminders = await sql`
      SELECT 
        pr.*
      FROM payment_reminders pr
      WHERE pr.customer_id = ${customerId}
      ORDER BY pr.sent_at DESC NULLS LAST, pr.id DESC
    `

    return NextResponse.json({
      success: true,
      reminders: reminders || [],
    })
  } catch (error) {
    console.error("Error fetching customer reminders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch reminders" }, { status: 500 })
  }
}
