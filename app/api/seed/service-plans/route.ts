import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST() {
  const sql = await getSql()

  try {
    console.log("[v0] Seeding default service plans...")

    // Check if service plans already exist
    const existingPlans = await sql`
      SELECT COUNT(*) as count FROM service_plans WHERE status = 'active'
    `

    if (Number(existingPlans[0].count) > 0) {
      return NextResponse.json({
        success: true,
        message: `Already have ${existingPlans[0].count} active service plans. No need to seed.`,
      })
    }

    const defaultPlans = [
      {
        name: "Basic Home",
        description: "Perfect for browsing and email",
        price: 2500,
        speed_download: 10,
        speed_upload: 5,
        data_limit: "Unlimited",
        billing_cycle: "monthly",
        status: "active",
      },
      {
        name: "Standard Home",
        description: "Stream HD videos and work from home",
        price: 4500,
        speed_download: 20,
        speed_upload: 10,
        data_limit: "Unlimited",
        billing_cycle: "monthly",
        status: "active",
      },
      {
        name: "Premium Business",
        description: "High-speed business connectivity",
        price: 8000,
        speed_download: 50,
        speed_upload: 25,
        data_limit: "Unlimited",
        billing_cycle: "monthly",
        status: "active",
      },
    ]

    const results = []
    for (const plan of defaultPlans) {
      const result = await sql`
        INSERT INTO service_plans (
          name, description, price, speed_download, speed_upload,
          data_limit, billing_cycle, status, currency,
          created_at, updated_at
        ) VALUES (
          ${plan.name}, ${plan.description}, ${plan.price},
          ${plan.speed_download}, ${plan.speed_upload}, ${plan.data_limit},
          ${plan.billing_cycle}, ${plan.status}, 'KES',
          NOW(), NOW()
        ) RETURNING id, name, price
      `
      results.push(result[0])
      console.log(`[v0] Created service plan: ${result[0].name} (ID: ${result[0].id})`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${results.length} default service plans`,
      plans: results,
    })
  } catch (error) {
    console.error("[v0] Error seeding service plans:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed service plans: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
