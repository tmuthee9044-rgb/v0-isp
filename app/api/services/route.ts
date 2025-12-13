import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db" // Fixed import path from @/lib/database to @/lib/db

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
    const sql = await getSql()
    const data = await request.json()

    const { basic, speed, pricing, fup, advanced, qos, restrictions } = data

    console.log("[v0] Creating service plan with data:", data)

    const result = await sql`
      INSERT INTO service_plans (
        name, 
        description, 
        speed_download, 
        speed_upload, 
        data_limit,
        price, 
        setup_fee,
        fup_limit,
        fup_speed,
        contract_period,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${basic.planName || "Unnamed Service"},
        ${basic.description || ""},
        ${parseIntOrNull(speed.downloadSpeed?.[0]) || 0},
        ${parseIntOrNull(speed.uploadSpeed?.[0]) || 0},
        ${parseIntOrNull(fup.dataLimit)},
        ${parseFloatOrNull(pricing.monthlyPrice) || 0},
        ${parseFloatOrNull(pricing.setupFee) || 0},
        ${parseIntOrNull(fup.dataLimit)},
        ${parseIntOrNull(fup.throttleSpeed?.[0])},
        ${parseIntOrNull(pricing.contractLength) || 12},
        ${basic.status === "active" ? true : false},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id, name, speed_download, speed_upload, price
    `

    console.log("[v0] Service plan created successfully with all fields:", result[0])

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
    const sql = await getSql()
    const servicePlans = await sql`
      SELECT 
        id, name, description,
        speed_download, speed_upload, 
        price, setup_fee,
        data_limit, fup_limit, fup_speed,
        contract_period, is_active,
        created_at, updated_at
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
