import { type NextRequest, NextResponse } from "next/server"
import { FairUsePolicyEngine } from "@/lib/fair-use-policy-engine"

export const dynamic = "force-dynamic"

/**
 * Activate burst mode for a customer service
 * POST /api/fair-use/burst
 * Body: { customerId, serviceId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, serviceId } = body

    if (!customerId || !serviceId) {
      return NextResponse.json(
        { error: "Customer ID and service ID required" },
        { status: 400 }
      )
    }

    const activated = await FairUsePolicyEngine.activateBurst(
      customerId,
      serviceId
    )

    if (!activated) {
      return NextResponse.json(
        { error: "Burst mode not available (cooldown active or not enabled)" },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Burst mode activated for 5 minutes",
    })
  } catch (error) {
    console.error("[v0] Error activating burst:", error)
    return NextResponse.json(
      { error: "Failed to activate burst mode" },
      { status: 500 }
    )
  }
}
