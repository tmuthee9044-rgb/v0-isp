import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerType = searchParams.get("customerType") || "all"

    // Get active bonus rules
    const bonusRules = await sql`
      SELECT 
        wbr.*,
        CASE 
          WHEN wbr.valid_until IS NULL THEN 'Ongoing'
          WHEN wbr.valid_until > CURRENT_TIMESTAMP THEN 
            EXTRACT(DAYS FROM (wbr.valid_until - CURRENT_TIMESTAMP))::text || ' days left'
          ELSE 'Expired'
        END as validity_status,
        CASE
          WHEN wbr.bonus_percentage > 0 AND wbr.bonus_fixed_amount > 0 THEN
            'Up to ' || wbr.bonus_percentage || '% or ' || wbr.bonus_fixed_amount || ' fixed bonus'
          WHEN wbr.bonus_percentage > 0 THEN
            wbr.bonus_percentage || '% cashback'
          WHEN wbr.bonus_fixed_amount > 0 THEN
            wbr.bonus_fixed_amount || ' fixed bonus'
          ELSE 'Points only'
        END as bonus_display
      FROM wallet_bonus_rules wbr
      WHERE wbr.is_active = true
        AND (wbr.valid_until IS NULL OR wbr.valid_until > CURRENT_TIMESTAMP)
        AND (wbr.target_customer_type IS NULL OR wbr.target_customer_type = 'all' OR wbr.target_customer_type = ${customerType})
      ORDER BY wbr.bonus_percentage DESC, wbr.topup_min_amount ASC
    `

    // Get active campaigns
    const activeCampaigns = await sql`
      SELECT 
        bc.*,
        EXTRACT(DAYS FROM (bc.end_date - CURRENT_TIMESTAMP))::integer as days_remaining
      FROM bonus_campaigns bc
      WHERE bc.is_active = true
        AND bc.start_date <= CURRENT_TIMESTAMP
        AND bc.end_date > CURRENT_TIMESTAMP
        AND (bc.max_participants IS NULL OR bc.current_participants < bc.max_participants)
      ORDER BY bc.end_date ASC
    `

    return NextResponse.json({
      bonusRules,
      activeCampaigns,
      summary: {
        totalActiveRules: bonusRules.length,
        totalActiveCampaigns: activeCampaigns.length,
        bestCashbackRate: bonusRules.length > 0 ? Math.max(...bonusRules.map((r) => r.bonus_percentage)) : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching bonus rules:", error)
    return NextResponse.json({ error: "Failed to fetch bonus rules" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      ruleName,
      topupMinAmount,
      bonusPercentage,
      bonusFixedAmount,
      pointsAwarded,
      pointsPerAmount,
      maxBonusAmount,
      validUntil,
      targetCustomerType,
      description,
    } = await request.json()

    if (!ruleName || (!bonusPercentage && !bonusFixedAmount && !pointsAwarded)) {
      return NextResponse.json({ error: "Rule name and at least one bonus type required" }, { status: 400 })
    }

    const newRule = await sql`
      INSERT INTO wallet_bonus_rules (
        rule_name, topup_min_amount, bonus_percentage, bonus_fixed_amount,
        points_awarded, points_per_amount, max_bonus_amount, valid_until,
        target_customer_type, description, created_by
      ) VALUES (
        ${ruleName}, ${topupMinAmount || 0}, ${bonusPercentage || 0}, ${bonusFixedAmount || 0},
        ${pointsAwarded || 0}, ${pointsPerAmount || 1}, ${maxBonusAmount},
        ${validUntil ? new Date(validUntil) : null}, ${targetCustomerType || "all"},
        ${description}, 1
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      rule: newRule[0],
    })
  } catch (error) {
    console.error("Error creating bonus rule:", error)
    return NextResponse.json({ error: "Failed to create bonus rule" }, { status: 500 })
  }
}
