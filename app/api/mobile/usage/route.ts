import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { verifyMobileToken } from "@/lib/mobile-auth"

export const dynamic = "force-dynamic"

/**
 * Get Customer Usage Data
 * GET /api/mobile/usage?serviceId=123&days=30
 * Requires Bearer token authentication
 */
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")
    const days = Number.parseInt(searchParams.get("days") || "30", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get usage from cache
    const usageData = await sql`
      SELECT 
        date,
        upload_mb,
        download_mb,
        total_mb,
        session_count,
        peak_speed_mbps
      FROM customer_usage_cache
      WHERE customer_id = ${customerId}
        ${serviceId ? sql`AND service_id = ${serviceId}` : sql``}
        AND date >= ${startDate.toISOString().split("T")[0]}
      ORDER BY date DESC
    `

    // Get current month total
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    const monthlyTotal = await sql`
      SELECT 
        COALESCE(SUM(total_mb), 0) as total_mb,
        COALESCE(SUM(upload_mb), 0) as upload_mb,
        COALESCE(SUM(download_mb), 0) as download_mb
      FROM customer_usage_cache
      WHERE customer_id = ${customerId}
        ${serviceId ? sql`AND service_id = ${serviceId}` : sql``}
        AND date >= ${currentMonth + "-01"}
    `

    // Get service details with fair-use limits
    const service = serviceId
      ? await sql`
          SELECT 
            cs.*,
            sp.fair_use_gb,
            sp.name as plan_name
          FROM customer_services cs
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE cs.id = ${serviceId} AND cs.customer_id = ${customerId}
        `
      : []

    const fairUseGB = service[0]?.fair_use_gb || 0
    const usedGB = (monthlyTotal[0]?.total_mb || 0) / 1024
    const remainingGB = Math.max(0, fairUseGB - usedGB)
    const usagePercent = fairUseGB > 0 ? (usedGB / fairUseGB) * 100 : 0

    return NextResponse.json({
      success: true,
      usage: usageData,
      summary: {
        totalMB: monthlyTotal[0]?.total_mb || 0,
        uploadMB: monthlyTotal[0]?.upload_mb || 0,
        downloadMB: monthlyTotal[0]?.download_mb || 0,
        totalGB: usedGB,
        fairUseGB,
        remainingGB,
        usagePercent: Math.min(100, usagePercent),
      },
      service: service[0] || null,
    })
  } catch (error) {
    console.error("[v0] Usage fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 })
  }
}
