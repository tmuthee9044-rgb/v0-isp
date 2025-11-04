import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      min_amount,
      bonus_percentage,
      points_awarded,
      valid_from,
      valid_until,
      target_customers,
    } = body

    const [campaign] = await sql`
      INSERT INTO loyalty_campaigns (
        name,
        description,
        min_amount,
        bonus_percentage,
        points_awarded,
        valid_from,
        valid_until,
        target_customers,
        is_active
      ) VALUES (
        ${name},
        ${description},
        ${min_amount},
        ${bonus_percentage},
        ${points_awarded},
        ${valid_from}::timestamptz,
        ${valid_until}::timestamptz,
        ${target_customers},
        true
      )
      RETURNING *
    `

    // Send campaign notifications immediately if campaign is starting now
    if (new Date(valid_from) <= new Date()) {
      await sql`SELECT send_campaign_notifications()`
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error("Failed to create loyalty campaign:", error)
    return NextResponse.json({ success: false, error: "Failed to create campaign" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const campaigns = await sql`
      SELECT * FROM loyalty_campaigns
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: campaigns,
    })
  } catch (error) {
    console.error("Failed to fetch loyalty campaigns:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch campaigns" }, { status: 500 })
  }
}
