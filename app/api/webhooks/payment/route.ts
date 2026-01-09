import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verify webhook signature (implement based on your payment provider)
    // const signature = request.headers.get('x-webhook-signature')
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Handle payment completion
    if (body.event === "payment.completed") {
      const { customer_id, amount, payment_id } = body.data

      // Update payment status
      await sql`
        UPDATE payments 
        SET status = 'completed', updated_at = NOW()
        WHERE id = ${payment_id}
      `

      // Mark related invoices as paid
      const invoices = await sql`
        SELECT * FROM invoices 
        WHERE customer_id = ${customer_id} 
        AND status IN ('pending', 'overdue')
        ORDER BY due_date ASC
      `

      let remainingAmount = amount
      for (const invoice of invoices) {
        if (remainingAmount >= invoice.amount) {
          await sql`
            UPDATE invoices 
            SET status = 'paid', paid_at = NOW()
            WHERE id = ${invoice.id}
          `
          remainingAmount -= invoice.amount
        }
      }

      // Update account balance
      await sql`
        UPDATE account_balances 
        SET 
          balance = balance - ${amount},
          status = CASE 
            WHEN balance - ${amount} <= 0 THEN 'current'
            ELSE status
          END,
          updated_at = NOW()
        WHERE customer_id = ${customer_id}
      `

      // Trigger reactivation check
      const reactivationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/automated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_payment_reactivation" }),
      })

      return NextResponse.json({
        success: true,
        message: "Payment processed and reactivation check triggered",
      })
    }

    return NextResponse.json({ success: true, message: "Webhook received" })
  } catch (error) {
    console.error("Error processing payment webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
