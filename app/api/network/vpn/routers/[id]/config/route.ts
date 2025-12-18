import { type NextRequest, NextResponse } from "next/server"
import { generateRouterOSConfig } from "@/lib/openvpn-integration"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const result = await generateRouterOSConfig(routerId)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      config: result.config,
      message: result.message,
    })
  } catch (error) {
    console.error("Error generating VPN config:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate configuration",
      },
      { status: 500 },
    )
  }
}
