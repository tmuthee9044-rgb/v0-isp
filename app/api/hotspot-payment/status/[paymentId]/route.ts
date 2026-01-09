import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const paymentId = params.paymentId

    // Check payment status
    const [payment] = await sql`
      SELECT * FROM payments WHERE id = ${paymentId}
    `

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })
    }

    if (payment.status === "completed") {
      // Check if voucher already exists
      let [voucher] = await sql`
        SELECT * FROM hotspot_vouchers WHERE payment_id = ${paymentId}
      `

      if (!voucher) {
        // Generate voucher from payment metadata
        const metadata = payment.metadata || {}
        voucher = await generateVoucher(metadata.hotspot_id, metadata.time_limit, metadata.data_limit, paymentId)
      }

      return NextResponse.json({
        status: "completed",
        voucher,
      })
    } else if (payment.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: "Payment was not successful",
      })
    } else {
      return NextResponse.json({
        status: "pending",
        message: "Payment is still being processed",
      })
    }
  } catch (error) {
    console.error("Error checking payment status:", error)
    return NextResponse.json({ success: false, error: "Failed to check payment status" }, { status: 500 })
  }
}

async function generateVoucher(hotspot_id: number, time_limit: number, data_limit: number, payment_id: string) {
  const code = generateVoucherCode()
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 7) // Valid for 7 days

  const [voucher] = await sql`
    INSERT INTO hotspot_vouchers (
      hotspot_id,
      code,
      time_limit,
      data_limit,
      max_users,
      expiry_date,
      status,
      payment_id,
      created_at
    )
    VALUES (
      ${hotspot_id},
      ${code},
      ${time_limit},
      ${data_limit},
      1,
      ${expiryDate.toISOString()},
      'active',
      ${payment_id},
      NOW()
    )
    RETURNING *
  `

  return voucher
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
