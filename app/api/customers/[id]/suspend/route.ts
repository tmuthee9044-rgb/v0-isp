import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { reason, notes, duration } = await request.json()

    if (isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    await sql`
      UPDATE customer_services 
      SET 
        status = 'suspended',
        suspension_reason = ${reason || ""},
        suspension_notes = ${notes || ""},
        suspended_at = NOW(),
        updated_at = NOW()
      WHERE customer_id = ${customerId} AND status = 'active'
    `

    await sql`
      UPDATE customers 
      SET 
        status = 'suspended',
        updated_at = NOW()
      WHERE id = ${customerId}
    `

    return NextResponse.json({
      success: true,
      message: "Customer services suspended successfully",
    })
  } catch (error) {
    console.error("Suspend service error:", error)
    return NextResponse.json({ success: false, error: "Failed to suspend service" }, { status: 500 })
  }
}
