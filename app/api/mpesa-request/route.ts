import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  let customerId: number | undefined
  let amount: number | undefined
  let phone: string | undefined

  try {
    const requestData = await request.json()
    customerId = requestData.customerId
    amount = requestData.amount
    phone = requestData.phone

    await ActivityLogger.logMpesaActivity(
      `Payment request initiated: KES ${amount} to ${phone}`,
      undefined,
      {
        customer_id: customerId,
        amount: amount,
        phone_number: phone,
        request_type: "payment_request",
      },
      "INFO",
    )

    // Create payment request record
    const result = await sql`
      INSERT INTO payment_requests (customer_id, amount, phone, method, status, created_at)
      VALUES (${customerId}, ${amount}, ${phone}, 'mpesa', 'pending', NOW())
      RETURNING id
    `

    await ActivityLogger.logMpesaActivity(
      `Payment request created successfully: Request ID ${result[0].id}`,
      result[0].id.toString(),
      {
        customer_id: customerId,
        amount: amount,
        phone_number: phone,
        payment_request_id: result[0].id,
        status: "pending",
      },
      "SUCCESS",
    )

    return NextResponse.json({
      success: true,
      message: "M-Pesa payment request sent successfully",
      requestId: result[0].id,
    })
  } catch (error) {
    await ActivityLogger.logMpesaActivity(
      "Failed to create M-Pesa payment request",
      undefined,
      {
        error: error instanceof Error ? error.message : "Unknown error",
        request_data: { customerId, amount, phone },
      },
      "ERROR",
    )

    console.error("[v0] Error sending M-Pesa request:", error)
    return NextResponse.json({ error: "Failed to send M-Pesa request" }, { status: 500 })
  }
}
