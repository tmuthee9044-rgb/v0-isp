import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { customerId, type } = await request.json()

    // Get customer details
    const customer = await sql`
      SELECT name, email, phone FROM customers WHERE id = ${customerId}
    `

    if (!customer.length) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customerData = customer[0]
    const welcomeMessage = `Welcome to TrustWaves Network! We're excited to have you as our customer. Your internet service is now active and ready to use.`

    // Log the communication
    await sql`
      INSERT INTO communications (customer_id, type, subject, content, status, direction, created_at)
      VALUES (${customerId}, ${type}, 'Welcome Message', ${welcomeMessage}, 'sent', 'outbound', NOW())
    `

    // In a real implementation, you would integrate with email/SMS services here
    console.log(`[v0] Sending welcome ${type} to ${customerData.name}`)

    return NextResponse.json({
      success: true,
      message: `Welcome ${type} sent successfully`,
    })
  } catch (error) {
    console.error("[v0] Error sending welcome message:", error)
    return NextResponse.json({ error: "Failed to send welcome message" }, { status: 500 })
  }
}
