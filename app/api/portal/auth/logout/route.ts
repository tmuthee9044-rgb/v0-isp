import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    // Clear authentication cookies
    response.cookies.delete("portal-auth-token")
    response.cookies.delete("portal-customer-id")

    return response
  } catch (error) {
    console.error("[v0] Portal logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
