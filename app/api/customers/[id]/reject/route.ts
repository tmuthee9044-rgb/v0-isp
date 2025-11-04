import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Update customer status to rejected
    await sql`
      UPDATE customers 
      SET status = 'rejected', updated_at = NOW()
      WHERE id = ${customerId}
    `

    // Log the rejection
    await sql`
      INSERT INTO customer_logs (
        customer_id,
        action,
        description,
        created_at
      ) VALUES (
        ${customerId},
        'rejected',
        'Customer registration rejected by admin',
        NOW()
      )
    `

    return NextResponse.json({ success: true, message: "Customer rejected" })
  } catch (error) {
    console.error("[v0] Error rejecting customer:", error)
    return NextResponse.json({ error: "Failed to reject customer" }, { status: 500 })
  }
}
