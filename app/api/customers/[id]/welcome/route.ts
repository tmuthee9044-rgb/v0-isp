import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get customer details
    const customer = await sql`
      SELECT first_name, last_name, email, phone
      FROM customers
      WHERE id = ${customerId}
    `

    if (customer.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    // Create welcome message
    await sql`
      INSERT INTO messages (
        recipient_id, recipient_type, message_type, subject, content, 
        status, created_at
      ) VALUES (
        ${customerId},
        'customer',
        'email',
        'Welcome to Our Service',
        'Dear ${customer[0].first_name}, welcome to our internet service. Your connection is now active.',
        'sent',
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Welcome email sent successfully",
    })
  } catch (error) {
    console.error("Error sending welcome email:", error)
    return NextResponse.json({ success: false, error: "Failed to send welcome email" }, { status: 500 })
  }
}
