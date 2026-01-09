import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const parseIntOrNull = (value: any): number | null => {
  if (value === "" || value === null || value === undefined) return null
  const parsed = Number.parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

const parseFloatOrNull = (value: any): number | null => {
  if (value === "" || value === null || value === undefined) return null
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const { basic, speed, pricing, fup, advanced, qos, restrictions } = data

    console.log("[v0] Creating service plan with data:", data)

    const priorityLevelMap: { [key: string]: number } = {
      low: 1,
      standard: 2,
      high: 3,
      critical: 4,
    }

    const priorityLevelInt = priorityLevelMap[speed.priorityLevel] || 2

    const result = await sql`
      INSERT INTO service_plans (
        name, description, category, status,
        download_speed, upload_speed, priority_level,
        price, billing_cycle, currency,
        data_limit, features, qos_settings, fair_usage_policy,
        created_at
      ) VALUES (
        ${basic.planName}, ${basic.description}, ${basic.category}, ${basic.status},
        ${parseIntOrNull(speed.downloadSpeed?.[0]) || 0}, ${parseIntOrNull(speed.uploadSpeed?.[0]) || 0}, ${priorityLevelInt},
        ${parseFloatOrNull(pricing.monthlyPrice) || 0}, ${pricing.billingCycle || "monthly"}, ${pricing.currency || "KES"},
        ${parseIntOrNull(fup.dataLimit)}, ${JSON.stringify(advanced || {})}, 
        ${qos.enabled ? JSON.stringify(qos) : null},
        ${fup.enabled ? `Data limit: ${fup.dataLimit || "unlimited"}, Action: ${fup.actionAfterLimit || "throttle"}` : null},
        CURRENT_TIMESTAMP
      ) RETURNING id, name
    `

    console.log("[v0] Service plan created successfully:", result[0])

    return NextResponse.json({
      success: true,
      message: "Service plan created successfully",
      data: result[0],
    })
  } catch (error) {
    console.error("[v0] Error creating service plan:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create service plan",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const servicePlans = await sql`
      SELECT 
        id, name, description, category, status,
        download_speed, upload_speed, price,
        billing_cycle, data_limit, features, 
        qos_settings, fair_usage_policy, priority_level,
        currency, created_at
      FROM service_plans 
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: servicePlans,
    })
  } catch (error) {
    console.error("[v0] Error fetching service plans:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch service plans",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
