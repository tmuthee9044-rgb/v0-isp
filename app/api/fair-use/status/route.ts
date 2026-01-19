import { type NextRequest, NextResponse } from "next/server"
import { FairUsePolicyEngine } from "@/lib/fair-use-policy-engine"

export const dynamic = "force-dynamic"

/**
 * Get fair-use status for a customer service
 * GET /api/fair-use/status?customerId=123&serviceId=456
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const serviceId = searchParams.get("serviceId")

    if (!customerId || !serviceId) {
      return NextResponse.json(
        { error: "Customer ID and service ID required" },
        { status: 400 }
      )
    }

    const status = await FairUsePolicyEngine.checkFairUseStatus(
      Number.parseInt(customerId),
      Number.parseInt(serviceId)
    )

    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    console.error("[v0] Error checking fair-use status:", error)
    return NextResponse.json(
      { error: "Failed to check fair-use status" },
      { status: 500 }
    )
  }
}
