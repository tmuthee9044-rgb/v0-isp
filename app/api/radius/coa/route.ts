import { type NextRequest, NextResponse } from "next/server"
import { sendCoARequest } from "@/lib/radius-integration"

/**
 * API endpoint for Change of Authorization (CoA)
 * Allows real-time modification of active RADIUS sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, username, session_id, action, download_speed, upload_speed, session_timeout } = body

    if (!customer_id && !username && !session_id) {
      return NextResponse.json({ error: "customer_id, username, or session_id required" }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 })
    }

    const result = await sendCoARequest({
      customerId: customer_id,
      username,
      sessionId: session_id,
      action,
      downloadSpeed: download_speed,
      uploadSpeed: upload_speed,
      sessionTimeout: session_timeout,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `CoA sent to ${result.sessions_updated} session(s)`,
      results: result.results,
    })
  } catch (error: any) {
    console.error("[v0] Error in CoA API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
