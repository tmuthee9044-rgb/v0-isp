import { type NextRequest, NextResponse } from "next/server"
import { RouterEnforcementWorker } from "@/lib/router-enforcement-worker"

export const dynamic = "force-dynamic"

/**
 * Router Enforcement Cron Job
 * 
 * Run this every 15-30 minutes to:
 * - Check all router compliance
 * - Auto-repair non-compliant routers
 * - Log enforcement actions
 * 
 * Vercel Cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/router-enforcement",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("[Cron] Unauthorized router enforcement attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting router enforcement")

    const result = await RouterEnforcementWorker.enforceAllRouters()

    return NextResponse.json({
      success: true,
      message: "Router enforcement complete",
      ...result,
    })
  } catch (error) {
    console.error("[Cron] Router enforcement error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
