import { type NextRequest, NextResponse } from "next/server"
import { multiGatewayManager } from "@/lib/multi-gateway-manager"

export async function POST(request: NextRequest) {
  try {
    await multiGatewayManager.loadGatewayConfigs()

    const paymentRequest = await request.json()

    if (!paymentRequest.customer_id || !paymentRequest.amount || !paymentRequest.payment_method) {
      return NextResponse.json({ success: false, error: "Missing required payment fields" }, { status: 400 })
    }

    const result = await multiGatewayManager.processPayment(paymentRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Multi-gateway payment processing error:", error)
    return NextResponse.json({ success: false, error: "Payment processing failed" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, paymentId, amount, reason } = await request.json()

    if (action === "refund") {
      const result = await multiGatewayManager.refundPayment(paymentId, amount, reason)
      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Payment action error:", error)
    return NextResponse.json({ success: false, error: "Payment action failed" }, { status: 500 })
  }
}
