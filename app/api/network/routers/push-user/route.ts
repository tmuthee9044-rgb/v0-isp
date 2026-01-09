import { type NextRequest, NextResponse } from "next/server"
import { pushUserToRouter } from "@/lib/router-push"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { routerId, username, password, profile, staticIp, pushToRouter } = body

    if (!pushToRouter) {
      return NextResponse.json({
        success: true,
        message: "RADIUS-only mode - no direct router push",
        method: "radius",
      })
    }

    const result = await pushUserToRouter({
      routerId,
      username,
      password,
      profile,
      staticIp,
      pushToRouter,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Router push API error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
