import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { activateService } from "@/lib/billing-engine"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, serviceId, amount, method, reference } = body

    if (!customerId || !serviceId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = await getSql()

    const [payment] = await sql`
      INSERT INTO payments (customer_id, service_id, amount, method, reference, status, paid_at)
      VALUES (${customerId}, ${serviceId}, ${amount}, ${method || "cash"}, ${reference || null}, 'confirmed', CURRENT_TIMESTAMP)
      RETURNING id
    `

    await activateService(serviceId, payment.id)

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: "Payment processed and service activated",
    })
  } catch (error) {
    console.error("[v0] Error processing payment:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Payment processing failed",
      },
      { status: 500 },
    )
  }
}
