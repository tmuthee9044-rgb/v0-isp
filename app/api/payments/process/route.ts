import { type NextRequest, NextResponse } from "next/server"
import { paymentGateway } from "@/lib/payment-gateway"

export async function POST(request: NextRequest) {
  try {
    const paymentRequest = await request.json()

    // Validate required fields
    if (!paymentRequest.customer_id || !paymentRequest.amount || !paymentRequest.payment_method) {
      return NextResponse.json({ error: "Customer ID, amount, and payment method are required" }, { status: 400 })
    }

    // Process payment through unified gateway
    const result = await paymentGateway.processPayment(paymentRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
  }
}
