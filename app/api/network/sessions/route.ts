import { type NextRequest, NextResponse } from "next/server"
import { getOnlineSessions, getUserSessionStats } from "@/lib/radius-manager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/network/sessions - Get all online sessions from RADIUS accounting
 * Query params:
 *   - username: Filter by specific username
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (username) {
      // Get specific user stats
      const stats = await getUserSessionStats(username)
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // Get all online sessions
    const sessions = await getOnlineSessions()

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching sessions:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
