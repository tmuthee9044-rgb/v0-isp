import { type NextRequest, NextResponse } from "next/server"
import { getVPNRouters } from "@/lib/openvpn-integration"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const routers = await getVPNRouters()

    return NextResponse.json({
      success: true,
      data: routers,
      count: routers.length,
    })
  } catch (error) {
    console.error("Error fetching VPN routers:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch VPN routers",
      },
      { status: 500 },
    )
  }
}
