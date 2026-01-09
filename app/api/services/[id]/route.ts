import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

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

// GET - Fetch single service plan
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    if (isNaN(serviceId)) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM service_plans 
      WHERE id = ${serviceId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Service plan not found" }, { status: 404 })
    }

    const servicePlan = result[0]
    const mappedData = {
      ...servicePlan,
      speed: `${servicePlan.download_speed || 100}/${servicePlan.upload_speed || 50}`,
      // Provide default values for fields that don't exist in database
      setup_fee: 0,
      promo_price: null,
      promo_duration: null,
      contract_length: 12,
      fup_config: servicePlan.fair_usage_policy
        ? JSON.stringify({
            enabled: true,
            dataLimit: servicePlan.data_limit?.toString() || "",
            limitType: "monthly",
            actionAfterLimit: "throttle",
            throttleSpeed: 10, // Default value since column doesn't exist
            resetDay: "1",
            exemptHours: [],
            exemptDays: [],
            warningThreshold: 80,
          })
        : null,
      qos_config: servicePlan.qos_settings,
      advanced_features: servicePlan.features,
      restrictions: {},
    }

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error("Error fetching service plan:", error)
    return NextResponse.json({ error: "Failed to fetch service plan" }, { status: 500 })
  }
}

// PUT - Update service plan
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    if (isNaN(serviceId)) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 })
    }

    const data = await request.json()

    const priorityLevelMap: { [key: string]: number } = {
      low: 1,
      standard: 2,
      high: 3,
      critical: 4,
    }

    const priorityLevelInt =
      typeof data.priority_level === "string" ? priorityLevelMap[data.priority_level] || 2 : data.priority_level || 2

    const result = await sql`
      UPDATE service_plans 
      SET 
        name = ${data.name},
        description = ${data.description},
        category = ${data.category},
        status = ${data.status},
        download_speed = ${parseIntOrNull(data.download_speed) || 0},
        upload_speed = ${parseIntOrNull(data.upload_speed) || 0},
        priority_level = ${priorityLevelInt},
        price = ${parseFloatOrNull(data.price) || 0},
        billing_cycle = ${data.billing_cycle || "monthly"},
        currency = ${data.currency || "KES"},
        data_limit = ${parseIntOrNull(data.data_limit)},
        features = ${JSON.stringify(data.advanced_features || {})},
        qos_settings = ${data.qos_config ? JSON.stringify(data.qos_config) : null},
        fair_usage_policy = ${data.fup_enabled ? `Data limit: ${data.data_limit || "unlimited"}, Action: ${data.action_after_limit || "throttle"}` : null}
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Service plan not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Service plan updated successfully",
      service: result[0],
    })
  } catch (error) {
    console.error("Error updating service plan:", error)
    return NextResponse.json({ error: "Failed to update service plan" }, { status: 500 })
  }
}

// DELETE - Delete service plan
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    if (isNaN(serviceId)) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM service_plans 
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Service plan not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Service plan deleted successfully" })
  } catch (error) {
    console.error("Error deleting service plan:", error)
    return NextResponse.json({ error: "Failed to delete service plan" }, { status: 500 })
  }
}
