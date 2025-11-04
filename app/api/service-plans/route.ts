import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
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

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
    })
  } catch (error) {
    console.error("Error fetching service plans:", error)

    // Return fallback plans if database fails
    const fallbackPlans = [
      {
        id: 1,
        name: "Basic Home",
        description: "Perfect for light browsing and email",
        price: 2999,
        speed: "10/5 Mbps",
        category: "residential",
        dataLimit: 50,
        taxRate: 16,
        setupFee: 500,
        contractLength: 12,
        billingCycle: "monthly",
        features: [],
        qosSettings: {},
        fairUsagePolicy: null,
        priorityLevel: 1,
        currency: "KES",
      },
      {
        id: 2,
        name: "Standard Home",
        description: "Great for streaming and working from home",
        price: 4999,
        speed: "25/10 Mbps",
        category: "residential",
        dataLimit: 100,
        taxRate: 16,
        setupFee: 500,
        contractLength: 12,
        billingCycle: "monthly",
        features: [],
        qosSettings: {},
        fairUsagePolicy: null,
        priorityLevel: 2,
        currency: "KES",
      },
      {
        id: 3,
        name: "Premium Home",
        description: "Ideal for heavy usage and gaming",
        price: 7999,
        speed: "50/25 Mbps",
        category: "residential",
        dataLimit: 200,
        taxRate: 16,
        setupFee: 0,
        contractLength: 12,
        billingCycle: "monthly",
        features: [],
        qosSettings: {},
        fairUsagePolicy: null,
        priorityLevel: 3,
        currency: "KES",
      },
      {
        id: 4,
        name: "Business Starter",
        description: "Enterprise-grade connectivity for small business",
        price: 14999,
        speed: "100/50 Mbps",
        category: "business",
        dataLimit: null,
        taxRate: 16,
        setupFee: 0,
        contractLength: 24,
        billingCycle: "monthly",
        features: [],
        qosSettings: {},
        fairUsagePolicy: null,
        priorityLevel: 4,
        currency: "KES",
      },
      {
        id: 5,
        name: "Enterprise Pro",
        description: "Maximum performance for large enterprises",
        price: 49999,
        speed: "500/250 Mbps",
        category: "enterprise",
        dataLimit: null,
        taxRate: 16,
        setupFee: 0,
        contractLength: 36,
        billingCycle: "monthly",
        features: [],
        qosSettings: {},
        fairUsagePolicy: null,
        priorityLevel: 5,
        currency: "KES",
      },
    ]

    return NextResponse.json({
      success: true,
      plans: fallbackPlans,
    })
  }
}
