import { type NextRequest, NextResponse } from "next/server"
import { checkAndProvisionActiveServices } from "@/lib/router-provisioning"

/**
 * Cron job to automatically provision active services to routers
 * Runs every 10-30 seconds to quickly activate new services
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] === Cron: Provision Active Services ===")
    console.log("[v0] Started at:", new Date().toISOString())

    await checkAndProvisionActiveServices()

    console.log("[v0] === Cron job completed successfully ===")

    return NextResponse.json({
      success: true,
      message: "Active services provisioning check completed",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Cron job error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
