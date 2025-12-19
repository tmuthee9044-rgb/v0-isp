import { type NextRequest, NextResponse } from "next/server"
import { sendDisconnectRequest } from "@/lib/radius-integration"

/**
 * API endpoint for Disconnect-Request
 * Terminates active RADIUS sessions immediately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, username, session_id, reason } = body

    if (!customer_id && !username && !session_id) {
      return NextResponse.json({ error: "customer_id, username, or session_id required" }, { status: 400 })
    }

    const result = await sendDisconnectRequest({
      customerId: customer_id,
      username,
      sessionId: session_id,
      reason: reason || "Administrative disconnect",
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Disconnected ${result.sessions_disconnected} session(s)`,
    })
  } catch (error: any) {
    console.error("[v0] Error in disconnect API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
