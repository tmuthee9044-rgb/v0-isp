import { type NextRequest, NextResponse } from "next/server"
import { sendDisconnectRequest } from "@/lib/radius-integration"

export async function POST(request: NextRequest, { params }: { params: { id: string; sessionId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const sessionId = params.sessionId

    // Send RADIUS Disconnect-Request to terminate the session
    const result = await sendDisconnectRequest({
      customerId,
      sessionId,
      reason: "Disconnected by administrator",
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Session disconnected successfully",
        sessions_disconnected: result.sessions_disconnected,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to disconnect session",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error disconnecting session:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to disconnect session",
      },
      { status: 500 },
    )
  }
}
