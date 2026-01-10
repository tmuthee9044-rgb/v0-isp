import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const sql = await getSql()

  try {
    const servicePlans = await sql`
      SELECT 
        sp.id,
        sp.name,
        sp.description,
        sp.price,
        sp.speed_download,
        sp.speed_upload,
        sp.category,
        sp.status,
        sp.setup_fee,
        sp.billing_cycle,
        sp.contract_period as contract_length,
        sp.tax_rate,
        sp.fup_enabled,
        sp.fup_limit,
        sp.fup_speed,
        sp.data_limit,
        sp.currency,
        sp.features,
        sp.qos_settings,
        sp.fair_usage_policy,
        sp.priority_level,
        sp.created_at,
        COUNT(cs.id) as customer_count
      FROM service_plans sp
      LEFT JOIN customer_services cs ON cs.service_plan_id = sp.id AND cs.status != 'cancelled'
      GROUP BY sp.id
      ORDER BY sp.price ASC
    `

    // Format plans for display
    const formattedPlans = servicePlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      speed: `${plan.speed_download || 0}/${plan.speed_upload || 0} Mbps`,
      category: plan.category || "residential",
      active: plan.status === "active",
      customers: Number(plan.customer_count) || 0,
      fup_limit: plan.fup_enabled ? plan.fup_limit : null,
      fup_speed: plan.fup_enabled ? `${plan.fup_speed || 0} Mbps` : null,
      tax_rate: Number(plan.tax_rate) || 16,
      setup_fee: Number(plan.setup_fee) || 0,
      contract_length: plan.contract_length || 12,
      billing_cycle: plan.billing_cycle || "monthly",
      currency: plan.currency || "KES",
      features: plan.features || [],
      qos_settings: plan.qos_settings || {},
      fair_usage_policy: plan.fair_usage_policy,
      priority_level: plan.priority_level || "standard",
      created_at: plan.created_at,
    }))

    if (servicePlans.length === 0) {
      return NextResponse.json({
        success: true,
        plans: [],
        message: "No service plans found. Please create service plans first.",
      })
    }

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
    })
  } catch (error) {
    console.error("Error fetching service plans:", error)

    return NextResponse.json(
      {
        success: false,
        plans: [],
        error: "Failed to load service plans from database. Please check database connection.",
      },
      { status: 500 },
    )
  }
}
