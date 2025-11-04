import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30"

    // Loyalty points summary
    const loyaltyStats = await sql`
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers_with_points,
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as total_points_earned,
        SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END) as total_points_redeemed,
        COUNT(CASE WHEN type = 'earn' THEN 1 END) as total_earn_transactions,
        COUNT(CASE WHEN type = 'redeem' THEN 1 END) as total_redeem_transactions
      FROM loyalty_transactions
      WHERE created_at >= NOW() - INTERVAL '${period} days'
    `

    // Top customers by loyalty points
    const topCustomers = await sql`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.loyalty_points,
        COUNT(lt.id) as transaction_count,
        SUM(CASE WHEN lt.type = 'earn' THEN lt.points ELSE 0 END) as points_earned,
        SUM(CASE WHEN lt.type = 'redeem' THEN lt.points ELSE 0 END) as points_redeemed
      FROM customers c
      LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
      WHERE c.loyalty_points > 0
      GROUP BY c.id, c.name, c.email, c.loyalty_points
      ORDER BY c.loyalty_points DESC
      LIMIT 10
    `

    // Bonus credits awarded
    const bonusStats = await sql`
      SELECT 
        COUNT(*) as total_bonus_transactions,
        SUM(amount) as total_bonus_amount,
        AVG(amount) as average_bonus_amount
      FROM wallet_transactions
      WHERE type = 'bonus'
        AND created_at >= NOW() - INTERVAL '${period} days'
    `

    // Campaign effectiveness
    const campaignStats = await sql`
      SELECT 
        wbr.name as campaign_name,
        wbr.bonus_percentage,
        wbr.points_awarded,
        COUNT(wt.id) as transactions_count,
        SUM(wt.amount) as total_topup_amount,
        SUM(CASE WHEN wt.type = 'bonus' THEN wt.amount ELSE 0 END) as total_bonus_awarded
      FROM wallet_bonus_rules wbr
      LEFT JOIN wallet_transactions wt ON wt.created_at BETWEEN wbr.valid_from AND wbr.valid_until
      WHERE wbr.is_active = true
        AND wbr.created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY wbr.id, wbr.name, wbr.bonus_percentage, wbr.points_awarded
      ORDER BY total_topup_amount DESC
    `

    return NextResponse.json({
      success: true,
      data: {
        loyaltyStats: loyaltyStats[0] || {},
        topCustomers,
        bonusStats: bonusStats[0] || {},
        campaignStats,
        period: Number.parseInt(period),
      },
    })
  } catch (error) {
    console.error("Failed to fetch loyalty reports:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch loyalty reports" }, { status: 500 })
  }
}
