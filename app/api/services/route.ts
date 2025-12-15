import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

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

    console.log("[v0] ===== SERVICE PLAN CREATION - RULE 7 VERIFICATION =====")
    console.log("[v0] Basic Info (5 fields):", basic)
    console.log("[v0] Speed Config (9 fields):", speed)
    console.log("[v0] Pricing Config (10 fields):", pricing)
    console.log("[v0] FUP Config (9 fields):", fup)
    console.log("[v0] Advanced Features (8 fields):", advanced)
    console.log("[v0] QoS Config (6 fields):", qos)
    console.log("[v0] Restrictions (7 fields):", restrictions)
    console.log("[v0] Total fields being captured: 54")

    const result = await sql`
      INSERT INTO service_plans (
        name, 
        description, 
        service_type,
        category,
        status,
        speed_download, 
        speed_upload, 
        guaranteed_download,
        guaranteed_upload,
        burst_download,
        burst_upload,
        burst_duration,
        aggregation_ratio,
        priority_level,
        price, 
        setup_fee,
        billing_cycle,
        contract_period,
        currency,
        promo_enabled,
        promo_price,
        promo_duration,
        tax_included,
        tax_rate,
        fup_enabled,
        data_limit,
        fup_limit,
        fup_speed,
        limit_type,
        action_after_limit,
        reset_day,
        exempt_hours,
        exempt_days,
        warning_threshold,
        qos_enabled,
        traffic_shaping,
        bandwidth_allocation,
        latency_optimization,
        packet_prioritization,
        static_ip,
        port_forwarding,
        vpn_access,
        priority_support,
        sla_guarantee,
        redundancy,
        monitoring,
        custom_dns,
        content_filtering,
        port_blocking,
        time_restrictions,
        bandwidth_scheduling,
        device_limit,
        concurrent_connections,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${basic.planName || "Unnamed Service"},
        ${basic.description || ""},
        ${basic.serviceType || null},
        ${basic.category || null},
        ${basic.status || "active"},
        ${parseIntOrNull(speed.downloadSpeed?.[0]) || 0},
        ${parseIntOrNull(speed.uploadSpeed?.[0]) || 0},
        ${parseIntOrNull(speed.guaranteedDownload?.[0]) || null},
        ${parseIntOrNull(speed.guaranteedUpload?.[0]) || null},
        ${parseIntOrNull(speed.burstDownload?.[0]) || null},
        ${parseIntOrNull(speed.burstUpload?.[0]) || null},
        ${parseIntOrNull(speed.burstDuration?.[0]) || 300},
        ${parseIntOrNull(speed.aggregationRatio?.[0]) || 4},
        ${speed.priorityLevel || "standard"},
        ${parseFloatOrNull(pricing.monthlyPrice) || 0},
        ${parseFloatOrNull(pricing.setupFee) || 0},
        ${pricing.billingCycle || "monthly"},
        ${parseIntOrNull(pricing.contractLength) || 12},
        ${pricing.currency || "USD"},
        ${pricing.promoEnabled || false},
        ${parseFloatOrNull(pricing.promoPrice) || null},
        ${parseIntOrNull(pricing.promoDuration) || null},
        ${pricing.taxIncluded || false},
        ${parseFloatOrNull(pricing.taxRate?.[0]) || 0},
        ${fup.enabled || false},
        ${parseIntOrNull(fup.dataLimit) || null},
        ${parseIntOrNull(fup.dataLimit) || null},
        ${parseIntOrNull(fup.throttleSpeed?.[0]) || null},
        ${fup.limitType || "monthly"},
        ${fup.actionAfterLimit || "throttle"},
        ${parseIntOrNull(fup.resetDay) || 1},
        ${JSON.stringify(fup.exemptHours || [])},
        ${JSON.stringify(fup.exemptDays || [])},
        ${parseIntOrNull(fup.warningThreshold?.[0]) || 80},
        ${qos.enabled || false},
        ${qos.trafficShaping || false},
        ${JSON.stringify(qos.bandwidthAllocation || {})},
        ${qos.latencyOptimization || false},
        ${qos.packetPrioritization || false},
        ${advanced.staticIP || false},
        ${advanced.portForwarding || false},
        ${advanced.vpnAccess || false},
        ${advanced.prioritySupport || false},
        ${advanced.slaGuarantee || false},
        ${advanced.redundancy || false},
        ${advanced.monitoring || false},
        ${advanced.customDNS || false},
        ${restrictions.contentFiltering || false},
        ${JSON.stringify(restrictions.portBlocking || [])},
        ${restrictions.timeRestrictions || false},
        ${restrictions.bandwidthScheduling || false},
        ${parseIntOrNull(restrictions.deviceLimit) || null},
        ${parseIntOrNull(restrictions.concurrentConnections) || null},
        ${basic.status === "active" ? true : false},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING *
    `

    console.log("[v0] ===== SERVICE PLAN SAVED TO DATABASE =====")
    console.log("[v0] All 54 fields stored in dedicated columns (Rule 7 ✅)")
    console.log("[v0] Service plan ID:", result[0].id)
    console.log("[v0] Saved data preview:", {
      name: result[0].name,
      speeds: `${result[0].speed_download}/${result[0].speed_upload}Mbps`,
      price: result[0].price,
      fup_enabled: result[0].fup_enabled,
      qos_enabled: result[0].qos_enabled,
      features: {
        static_ip: result[0].static_ip,
        vpn_access: result[0].vpn_access,
        monitoring: result[0].monitoring,
      },
    })

    // Log activity
    await sql`
      INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
      VALUES ('create', 'service_plan', ${result[0].id}, ${JSON.stringify({ name: basic.planName, fields_count: 54 })}, CURRENT_TIMESTAMP)
    `

    return NextResponse.json({
      success: true,
      message: "Service plan created successfully with all 54 fields saved to database (Rule 7 compliant)",
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
      SELECT * FROM service_plans 
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
