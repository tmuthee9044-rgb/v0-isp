import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()
    const bonusRules = await sql`
      SELECT 
        id,
        name,
        description,
        topup_min_amount,
        bonus_percentage,
        points_awarded,
        is_active,
        valid_from,
        valid_until,
        created_at,
        updated_at
      FROM wallet_bonus_rules
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: bonusRules,
    })
  } catch (error) {
    console.error("Failed to fetch bonus rules:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bonus rules" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const { name, description, topup_min_amount, bonus_percentage, points_awarded, valid_from, valid_until } = body

    const [bonusRule] = await sql`
      INSERT INTO wallet_bonus_rules (
        name,
        description,
        topup_min_amount,
        bonus_percentage,
        points_awarded,
        valid_from,
        valid_until,
        is_active
      ) VALUES (
        ${name},
        ${description},
        ${topup_min_amount},
        ${bonus_percentage},
        ${points_awarded},
        ${valid_from}::timestamptz,
        ${valid_until}::timestamptz,
        true
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: bonusRule,
    })
  } catch (error) {
    console.error("Failed to create bonus rule:", error)
    return NextResponse.json({ success: false, error: "Failed to create bonus rule" }, { status: 500 })
  }
}
