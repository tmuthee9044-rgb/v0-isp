import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { verifyMobileToken } from "@/lib/mobile-auth"

export const dynamic = "force-dynamic"

/**
 * Get Customer Services (Multi-Service Support)
 * GET /api/mobile/services
 */
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()

    const services = await sql`
      SELECT 
        cs.id,
        cs.service_plan_id,
        cs.status,
        cs.portal_username,
        cs.download_speed,
        cs.upload_speed,
        cs.ip_address,
        cs.installation_date,
        cs.next_billing_date,
        sp.name as plan_name,
        sp.price,
        sp.fair_use_gb,
        sp.description as plan_description,
        l.name as location_name,
        l.address as location_address
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN locations l ON cs.location_id = l.id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `

    // Get current usage for each service
    const servicesWithUsage = await Promise.all(
      services.map(async (service) => {
        const currentMonth = new Date().toISOString().substring(0, 7)
        const usage = await sql`
          SELECT 
            COALESCE(SUM(total_mb), 0) as total_mb,
            COALESCE(SUM(upload_mb), 0) as upload_mb,
            COALESCE(SUM(download_mb), 0) as download_mb
          FROM customer_usage_cache
          WHERE service_id = ${service.id}
            AND date >= ${currentMonth + "-01"}
        `

        const usedGB = (usage[0]?.total_mb || 0) / 1024
        const fairUseGB = service.fair_use_gb || 0
        const remainingGB = Math.max(0, fairUseGB - usedGB)

        return {
          ...service,
          usage: {
            usedGB,
            fairUseGB,
            remainingGB,
            usagePercent: fairUseGB > 0 ? (usedGB / fairUseGB) * 100 : 0,
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      services: servicesWithUsage,
    })
  } catch (error) {
    console.error("[v0] Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
