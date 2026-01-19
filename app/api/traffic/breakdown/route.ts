import { type NextRequest, NextResponse } from "next/server"
import { TrafficClassificationEngine } from "@/lib/traffic-classification-engine"

export const dynamic = "force-dynamic"

/**
 * Get traffic breakdown by category
 * GET /api/traffic/breakdown?customerId=123&serviceId=456&days=7
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const serviceId = searchParams.get("serviceId")
    const days = Number.parseInt(searchParams.get("days") || "7", 10)

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      )
    }

    const breakdown = await TrafficClassificationEngine.getTrafficBreakdown(
      Number.parseInt(customerId),
      serviceId ? Number.parseInt(serviceId) : null,
      days
    )

    return NextResponse.json({ success: true, breakdown })
  } catch (error) {
    console.error("[v0] Error fetching traffic breakdown:", error)
    return NextResponse.json(
      { error: "Failed to fetch traffic breakdown" },
      { status: 500 }
    )
  }
}
