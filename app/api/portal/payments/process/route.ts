import { type NextRequest, NextResponse } from "next/server"
import { paymentGateway } from "@/lib/payment-gateway"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const paymentMethod = formData.get("payment_method") as string
    const phoneNumber = formData.get("phone_number") as string

    if (!customerId || !amount || !paymentMethod) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const paymentRequest = {
      customer_id: customerId,
      amount,
      currency: "KES",
      payment_method: paymentMethod as "mpesa" | "card" | "bank_transfer",
      description: `Service payment via customer portal`,
      metadata: {
        phone_number: phoneNumber,
        source: "customer_portal",
      },
    }

    const result = await paymentGateway.processPayment(paymentRequest)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Payment initiated successfully. You will receive a prompt on your phone.",
        payment_id: result.payment_id,
        transaction_id: result.transaction_id,
      })
    } else {
      return NextResponse.json({ success: false, error: result.error || "Payment processing failed" }, { status: 400 })
    }
  } catch (error) {
    console.error("Portal payment processing error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
