import { NextResponse } from "next/server"
import { suspendExpiredServices } from "@/lib/billing-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Automated suspension job - call this every 5 minutes via cron
 * Example cron: every 5 minutes call this endpoint
 * POST https://your-domain.com/api/billing/suspend-expired
 */
export async function POST() {
  try {
    console.log("[v0] Running automated service suspension check...")

    const result = await suspendExpiredServices()

    console.log(`[v0] Suspended ${result.suspended} expired services`)

    return NextResponse.json({
      success: true,
      suspended: result.suspended,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in suspension job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Suspension job failed",
      },
      { status: 500 },
    )
  }
}
