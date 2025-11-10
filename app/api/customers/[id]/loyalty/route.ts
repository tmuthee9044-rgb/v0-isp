import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get customer loyalty points balance
    const customer = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        COALESCE(loyalty_points, 0) as loyalty_points
      FROM customers
      WHERE id = ${customerId}
    `

    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Get loyalty transaction history
    const loyaltyHistory = await sql`
      SELECT 
        lt.*,
        CASE 
          WHEN lt.source_type = 'topup' THEN 'Wallet Top-up'
          WHEN lt.source_type = 'payment' THEN 'Service Payment'
          WHEN lt.source_type = 'bonus' THEN 'Bonus Points'
          WHEN lt.source_type = 'manual' THEN 'Manual Adjustment'
          ELSE INITCAP(lt.source_type)
        END as source_display
      FROM loyalty_transactions lt
      WHERE lt.customer_id = ${customerId}
      ORDER BY lt.created_at DESC
      LIMIT 20
    `

    // Calculate points summary
    const pointsSummary = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'earn' THEN points ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(points) ELSE 0 END), 0) as total_redeemed,
        COUNT(CASE WHEN transaction_type = 'earn' THEN 1 END) as earning_transactions,
        COUNT(CASE WHEN transaction_type = 'redeem' THEN 1 END) as redemption_transactions
      FROM loyalty_transactions
      WHERE customer_id = ${customerId}
    `

    // Get available redemption options
    const redemptionOptions = [
      {
        type: "wallet_credit",
        name: "Wallet Credit",
        description: "Convert points to wallet credit",
        rate: 100, // 100 points = 1 currency unit
        minPoints: 100,
        icon: "wallet",
      },
      {
        type: "service_discount",
        name: "Service Discount",
        description: "Apply discount to next invoice",
        rate: 50, // 50 points = 1 currency unit discount
        minPoints: 250,
        icon: "discount",
      },
      {
        type: "bandwidth_days",
        name: "Extra Bandwidth Days",
        description: "Get additional high-speed days",
        rate: 200, // 200 points = 1 extra day
        minPoints: 200,
        icon: "zap",
      },
    ]

    return NextResponse.json({
      customer: customer[0],
      loyaltyHistory,
      summary: pointsSummary[0],
      redemptionOptions: redemptionOptions.filter((option) => customer[0].loyalty_points >= option.minPoints),
    })
  } catch (error) {
    console.error("Error fetching loyalty data:", error)
    return NextResponse.json({ error: "Failed to fetch loyalty data" }, { status: 500 })
  }
}
