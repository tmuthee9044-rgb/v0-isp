import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const sql = await getSql()

  try {
    // Get service plans from database
    const servicePlans = await sql`
      SELECT 
        id,
        name,
        description,
        price,
        download_speed,
        upload_speed,
        data_limit,
        status,
        created_at,
        billing_cycle,
        features,
        qos_settings,
        fair_usage_policy,
        priority_level,
        currency
      FROM service_plans 
      WHERE status = 'active'
      ORDER BY price ASC
    `

    // Format plans for customer form
    const formattedPlans = servicePlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      speed: `${plan.download_speed}/${plan.upload_speed} Mbps`,
      category: "residential", // Default category since column doesn't exist
      dataLimit: plan.data_limit,
      taxRate: 16, // Default tax rate
      setupFee: 0, // Default setup fee
      contractLength: 12, // Default contract length
      billingCycle: plan.billing_cycle,
      features: plan.features || [],
      qosSettings: plan.qos_settings || {},
      fairUsagePolicy: plan.fair_usage_policy,
      priorityLevel: plan.priority_level,
      currency: plan.currency || "KES",
    }))

    // Return empty array instead of fallback plans if no active plans found
    if (servicePlans.length === 0) {
      return NextResponse.json({
        success: true,
        plans: [],
        message: "No active service plans found. Please create service plans in /services first.",
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
