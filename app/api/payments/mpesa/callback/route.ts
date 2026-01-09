import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { WalletManager } from "@/lib/wallet-manager"

/**
 * M-Pesa STK Callback Handler
 * Per design: Idempotent, wallet-first, deterministic
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    console.log("[v0] M-Pesa callback received:", payload)

    // Extract transaction details
    const resultCode = payload.Body?.stkCallback?.ResultCode
    if (resultCode !== 0) {
      // Payment failed or cancelled
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    const metadata = payload.Body?.stkCallback?.CallbackMetadata?.Item || []
    const amount = metadata.find((i: any) => i.Name === "Amount")?.Value || 0
    const receiptNumber = metadata.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || ""
    const phoneNumber = metadata.find((i: any) => i.Name === "PhoneNumber")?.Value || ""

    if (!receiptNumber || amount <= 0) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Invalid transaction" })
    }

    const sql = await getSql()

    // Idempotent: Check if already processed
    const [existing] = await sql`
      SELECT id FROM payments
      WHERE reference = ${receiptNumber}
    `

    if (existing) {
      console.log("[v0] Payment already processed:", receiptNumber)
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" })
    }

    // Find customer by phone number
    const [customer] = await sql`
      SELECT id FROM customers
      WHERE phone = ${phoneNumber}
      LIMIT 1
    `

    if (!customer) {
      console.log("[v0] Customer not found for phone:", phoneNumber)
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Customer not found" })
    }

    await sql.begin(async (tx) => {
      // Insert payment
      const [payment] = await tx`
        INSERT INTO payments (
          customer_id, gateway, amount, reference, status, raw_payload, paid_at
        ) VALUES (
          ${customer.id}::uuid, 'mpesa', ${amount}, ${receiptNumber}, 'confirmed',
          ${JSON.stringify(payload)}, NOW()
        ) RETURNING id
      `

      // Credit wallet (Golden Rule #2)
      await WalletManager.creditWallet(customer.id, payment.id, amount, receiptNumber)

      // Queue allocation (Golden Rule #3)
      await WalletManager.allocateToServices(customer.id, "oldest_expiry")
    })

    console.log("[v0] Payment processed successfully:", receiptNumber)

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" })
  } catch (error) {
    console.error("[v0] M-Pesa callback error:", error)
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal error" }, { status: 500 })
  }
}
