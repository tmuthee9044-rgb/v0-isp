import { type NextRequest, NextResponse } from "next/server"
import { paymentGateway } from "@/lib/payment-gateway"
import { ActivityLogger } from "@/lib/activity-logger"
import { sql } from "@/lib/db" // Declare the sql variable

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()

    await ActivityLogger.logSystemActivity("Payment webhook received", {
      webhook_data: webhookData,
      headers: Object.fromEntries(request.headers.entries()),
    })

    // Determine payment gateway and process webhook
    if (webhookData.Body?.stkCallback || webhookData.TransactionType) {
      // M-Pesa webhook
      await processMpesaWebhook(webhookData)
    } else if (webhookData.event_type) {
      // Stripe/Flutterwave webhook
      await processCardWebhook(webhookData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function processMpesaWebhook(data: any) {
  if (data.Body?.stkCallback) {
    const callback = data.Body.stkCallback
    const checkoutRequestId = callback.CheckoutRequestID

    if (callback.ResultCode === 0) {
      // Payment successful
      const metadata = callback.CallbackMetadata?.Item || []
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value

      // Find payment by checkout request ID
      const [payment] = await sql`
        SELECT p.id FROM payments p
        JOIN mpesa_transactions mt ON p.id = mt.payment_id
        WHERE mt.checkout_request_id = ${checkoutRequestId}
      `

      if (payment) {
        await paymentGateway.confirmPayment(payment.id, {
          mpesa_receipt_number: mpesaReceiptNumber,
          callback_data: data,
        })
      }
    }
  }
}

async function processCardWebhook(data: any) {
  // Process card payment webhooks (Stripe, Flutterwave, etc.)
  if (data.event_type === "charge.success") {
    const paymentId = data.data?.metadata?.payment_id
    if (paymentId) {
      await paymentGateway.confirmPayment(paymentId, data)
    }
  }
}
