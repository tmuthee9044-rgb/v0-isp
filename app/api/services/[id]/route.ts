import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"

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
    const sql = await getSql()
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
      download_speed: servicePlan.speed_download,
      upload_speed: servicePlan.speed_upload,
      speed: `${servicePlan.speed_download || 100}/${servicePlan.speed_upload || 50}`,
      setup_fee: servicePlan.setup_fee || 0,
      promo_price: servicePlan.promo_price || null,
      promo_duration: servicePlan.promo_duration || null,
      contract_length: servicePlan.contract_period || 12,
      fup_config: servicePlan.fup_enabled
        ? JSON.stringify({
            enabled: true,
            dataLimit: servicePlan.data_limit?.toString() || "",
            limitType: servicePlan.limit_type || "monthly",
            actionAfterLimit: servicePlan.action_after_limit || "throttle",
            throttleSpeed: servicePlan.fup_speed || 10,
            resetDay: servicePlan.reset_day?.toString() || "1",
            exemptHours: servicePlan.exempt_hours ? JSON.parse(servicePlan.exempt_hours) : [],
            exemptDays: servicePlan.exempt_days ? JSON.parse(servicePlan.exempt_days) : [],
            warningThreshold: servicePlan.warning_threshold || 80,
          })
        : null,
      qos_config: servicePlan.bandwidth_allocation,
      advanced_features: {
        static_ip: servicePlan.static_ip,
        port_forwarding: servicePlan.port_forwarding,
        vpn_access: servicePlan.vpn_access,
        priority_support: servicePlan.priority_support,
      },
      restrictions: {
        device_limit: servicePlan.device_limit,
        concurrent_connections: servicePlan.concurrent_connections,
      },
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
    const sql = await getSql()
    const serviceId = Number.parseInt(params.id)

    if (isNaN(serviceId)) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 })
    }

    const data = await request.json()

    const priorityLevelValue = data.priority_level || "standard"

    const result = await sql`
      UPDATE service_plans 
      SET 
        name = ${data.name},
        description = ${data.description},
        category = ${data.category},
        status = ${data.status},
        speed_download = ${parseIntOrNull(data.download_speed) || 0},
        speed_upload = ${parseIntOrNull(data.upload_speed) || 0},
        priority_level = ${priorityLevelValue},
        price = ${parseFloatOrNull(data.price) || 0},
        billing_cycle = ${data.billing_cycle || "monthly"},
        currency = ${data.currency || "KES"},
        data_limit = ${parseIntOrNull(data.data_limit)},
        fup_enabled = ${data.fup_enabled || false},
        action_after_limit = ${data.action_after_limit || "throttle"},
        bandwidth_allocation = ${data.qos_config ? JSON.stringify(data.qos_config) : null},
        static_ip = ${data.advanced_features?.static_ip || false},
        port_forwarding = ${data.advanced_features?.port_forwarding || false},
        vpn_access = ${data.advanced_features?.vpn_access || false},
        priority_support = ${data.advanced_features?.priority_support || false},
        device_limit = ${parseIntOrNull(data.restrictions?.device_limit)},
        concurrent_connections = ${parseIntOrNull(data.restrictions?.concurrent_connections)},
        updated_at = NOW()
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
    const sql = await getSql()
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
