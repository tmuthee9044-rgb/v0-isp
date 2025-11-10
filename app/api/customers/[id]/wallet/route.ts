import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get wallet balance and summary
    const walletBalance = await sql`
      SELECT 
        wb.*,
        c.first_name,
        c.last_name
      FROM wallet_balances wb
      JOIN customers c ON wb.customer_id = c.id
      WHERE wb.customer_id = ${customerId}
    `

    if (walletBalance.length === 0) {
      // Create wallet balance record if it doesn't exist
      await sql`
        INSERT INTO wallet_balances (customer_id, current_balance)
        VALUES (${customerId}, 0)
      `

      const newBalance = await sql`
        SELECT 
          wb.*,
          c.first_name,
          c.last_name
        FROM wallet_balances wb
        JOIN customers c ON wb.customer_id = c.id
        WHERE wb.customer_id = ${customerId}
      `

      return NextResponse.json({
        balance: newBalance[0],
        recentTransactions: [],
        activeOffers: [],
      })
    }

    // Get recent wallet transactions
    const recentTransactions = await sql`
      SELECT *
      FROM wallet_transactions
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get active bonus offers
    const activeOffers = await sql`
      SELECT 
        wbr.*,
        CASE 
          WHEN wbr.valid_until IS NULL THEN true
          WHEN wbr.valid_until > CURRENT_TIMESTAMP THEN true
          ELSE false
        END as is_valid
      FROM wallet_bonus_rules wbr
      WHERE wbr.is_active = true
        AND (wbr.valid_until IS NULL OR wbr.valid_until > CURRENT_TIMESTAMP)
        AND (wbr.target_customer_type IS NULL OR wbr.target_customer_type = 'all')
      ORDER BY wbr.bonus_percentage DESC, wbr.topup_min_amount ASC
    `

    return NextResponse.json({
      balance: walletBalance[0],
      recentTransactions,
      activeOffers,
    })
  } catch (error) {
    console.error("Error fetching wallet data:", error)
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 })
  }
}
