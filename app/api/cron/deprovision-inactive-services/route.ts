import { type NextRequest, NextResponse } from "next/server"
import { checkAndDeprovisionInactiveServices } from "@/lib/router-provisioning"

/**
 * Cron job to automatically deprovision inactive services from routers
 * Updated to run every 10-30 seconds for real-time service management
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] === Cron: Deprovision Inactive Services ===")
    console.log("[v0] Started at:", new Date().toISOString())

    await checkAndDeprovisionInactiveServices()

    console.log("[v0] === Cron job completed successfully ===")

    return NextResponse.json({
      success: true,
      message: "Inactive services check completed",
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
