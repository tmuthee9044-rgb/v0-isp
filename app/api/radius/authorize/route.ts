import { NextResponse } from "next/server"
import { checkServiceAccess } from "@/lib/billing-engine"

export const dynamic = "force-dynamic"

/**
 * RADIUS Authorization Check
 * Called by FreeRADIUS for Access-Request packets
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ authorized: false, reason: "Missing username" }, { status: 400 })
    }

    const hasAccess = await checkServiceAccess(username)

    if (hasAccess) {
      return NextResponse.json({
        authorized: true,
        reply: {
          "Reply-Message": "Access granted",
        },
      })
    }

    return NextResponse.json({
      authorized: false,
      reason: "Service expired or suspended",
    })
  } catch (error) {
    console.error("[v0] Error in RADIUS authorization:", error)
    return NextResponse.json({ authorized: false, reason: "Internal error" }, { status: 500 })
  }
}
