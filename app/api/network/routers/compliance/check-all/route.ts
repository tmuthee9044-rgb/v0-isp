import { type NextRequest, NextResponse } from "next/server"
import { RouterComplianceChecker } from "@/lib/router-compliance"

export const dynamic = "force-dynamic"

/**
 * Run compliance check on all routers
 * This can be triggered by a cron job or manually
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting compliance check for all routers...")

    const results = await RouterComplianceChecker.checkAllRouters()

    const summary = {
      total: results.length,
      compliant: results.filter((r) => r.overallStatus === "compliant").length,
      partial: results.filter((r) => r.overallStatus === "partial").length,
      broken: results.filter((r) => r.overallStatus === "broken").length,
    }

    console.log("[v0] Compliance check complete:", summary)

    return NextResponse.json({
      success: true,
      summary,
      results,
    })
  } catch (error) {
    console.error("[v0] Error checking all router compliance:", error)
    return NextResponse.json(
      { error: "Failed to check router compliance" },
      { status: 500 },
    )
  }
}

/**
 * Get summary of all router compliance
 */
export async function GET(request: NextRequest) {
  try {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()

    const summary = await sql`
      SELECT 
        overall_status,
        COUNT(*) as count
      FROM router_compliance
      GROUP BY overall_status
    `

    const recentChecks = await sql`
      SELECT 
        rc.*,
        nd.name as router_name,
        nd.ip_address
      FROM router_compliance rc
      JOIN network_devices nd ON rc.router_id = nd.id
      ORDER BY rc.last_checked DESC
      LIMIT 10
    `

    return NextResponse.json({
      summary,
      recentChecks,
    })
  } catch (error) {
    console.error("[v0] Error fetching compliance summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch compliance summary" },
      { status: 500 },
    )
  }
}
