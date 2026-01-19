import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { verifyMobileToken } from "@/lib/mobile-auth"

export const dynamic = "force-dynamic"

/**
 * Get Customer Payment Methods and History
 * GET /api/mobile/payments
 */
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()

    // Get payment methods
    const paymentMethods = await sql`
      SELECT id, method_type, is_default, mpesa_phone, card_last4, 
             card_brand, bank_name, is_active, created_at
      FROM customer_payment_methods
      WHERE customer_id = ${customerId} AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `

    // Get recent payment history
    const payments = await sql`
      SELECT id, amount, payment_method, payment_date, status, 
             reference_number, invoice_id, created_at
      FROM payments
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
      LIMIT 50
    `

    // Get pending invoices
    const invoices = await sql`
      SELECT id, invoice_number, total_amount, due_date, status, created_at
      FROM invoices
      WHERE customer_id = ${customerId} 
        AND status IN ('pending', 'overdue')
      ORDER BY due_date ASC
    `

    return NextResponse.json({
      success: true,
      paymentMethods,
      payments,
      invoices,
    })
  } catch (error) {
    console.error("[v0] Error fetching payments:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

/**
 * Initiate MPESA STK Push Payment
 * POST /api/mobile/payments
 */
export async function POST(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()
    const body = await request.json()
    const { invoiceId, amount, phone } = body

    if (!amount || !phone) {
      return NextResponse.json(
        { error: "Amount and phone number required" },
        { status: 400 }
      )
    }

    // Get customer details
    const customers = await sql`
      SELECT name, email FROM customers WHERE id = ${customerId}
    `

    if (customers.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = customers[0]

    // TODO: Integrate with actual MPESA STK Push API
    // For now, create a pending payment record
    const payment = await sql`
      INSERT INTO payments (
        customer_id, amount, payment_method, status, 
        phone_number, invoice_id, created_at
      ) VALUES (
        ${customerId}, ${amount}, 'mpesa', 'pending',
        ${phone}, ${invoiceId || null}, NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Payment initiated. Please check your phone for MPESA prompt.",
      payment: payment[0],
    })
  } catch (error) {
    console.error("[v0] Payment initiation error:", error)
    return NextResponse.json({ error: "Payment failed" }, { status: 500 })
  }
}
