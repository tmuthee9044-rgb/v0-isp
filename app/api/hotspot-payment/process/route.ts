import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { paymentGateway } from "@/lib/payment-gateway"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { hotspot_id, package_id, payment_method, phone_number, email, amount, time_limit, data_limit } = data

    // Validate hotspot exists
    const [hotspot] = await sql`
      SELECT * FROM hotspots WHERE id = ${hotspot_id} AND status = 'active'
    `

    if (!hotspot) {
      return NextResponse.json({ success: false, error: "Hotspot not found or inactive" }, { status: 400 })
    }

    // Create guest customer record
    const [guestCustomer] = await sql`
      INSERT INTO customers (
        first_name, 
        last_name, 
        email, 
        phone, 
        customer_type, 
        status,
        created_at
      )
      VALUES (
        'Guest',
        'User',
        ${email || null},
        ${phone_number},
        'guest',
        'active',
        NOW()
      )
      RETURNING id
    `

    // Process payment through unified gateway
    const paymentResult = await paymentGateway.processPayment({
      customer_id: guestCustomer.id,
      amount: amount,
      currency: "KES",
      payment_method: payment_method as any,
      description: `Hotspot access - ${package_id}`,
      reference: `HOTSPOT-${Date.now()}`,
      metadata: {
        hotspot_id,
        package_id,
        phone_number,
        time_limit,
        data_limit,
        guest_payment: true,
      },
    })

    if (paymentResult.success) {
      if (payment_method === "mpesa") {
        // For M-Pesa, return payment ID for status polling
        return NextResponse.json({
          success: true,
          payment_id: paymentResult.payment_id,
          message: "M-Pesa payment initiated. Please complete on your phone.",
        })
      } else {
        // For other payment methods, generate voucher immediately
        const voucher = await generateVoucher(hotspot_id, time_limit, data_limit, paymentResult.payment_id!)

        return NextResponse.json({
          success: true,
          voucher,
          payment_id: paymentResult.payment_id,
        })
      }
    } else {
      return NextResponse.json({ success: false, error: paymentResult.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Hotspot payment processing error:", error)
    return NextResponse.json({ success: false, error: "Payment processing failed" }, { status: 500 })
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
