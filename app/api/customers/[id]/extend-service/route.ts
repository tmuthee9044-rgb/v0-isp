import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { days, amount, includeInInvoice } = await request.json()

    if (isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    await sql`
      UPDATE customer_services 
      SET 
        next_billing_date = next_billing_date + INTERVAL '${days} days',
        updated_at = NOW()
      WHERE customer_id = ${customerId} AND status = 'active'
    `

    if (amount > 0) {
      await sql`
        INSERT INTO payments (
          customer_id,
          amount,
          payment_method,
          status,
          description,
          created_at
        ) VALUES (
          ${customerId},
          ${amount},
          'extension',
          'completed',
          'Service extension for ${days} days',
          NOW()
        )
      `
    }

    return NextResponse.json({
      success: true,
      message: `Service extended by ${days} days successfully`,
    })
  } catch (error) {
    console.error("Extend service error:", error)
    return NextResponse.json({ success: false, error: "Failed to extend service" }, { status: 500 })
  }
}
