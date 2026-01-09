import { type NextRequest, NextResponse } from "next/server"
import { createRouterVPNProfile } from "@/lib/openvpn-integration"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const sql = await getSql()

    // Get router details
    const router = await sql`
      SELECT id, name, location_id FROM network_devices WHERE id = ${routerId}
    `

    if (router.length === 0) {
      return NextResponse.json({ success: false, error: "Router not found" }, { status: 404 })
    }

    const result = await createRouterVPNProfile({
      routerId: routerId,
      routerName: router[0].name,
      locationId: router[0].location_id,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.vpnProfile,
    })
  } catch (error) {
    console.error("Error creating VPN profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create VPN profile",
      },
      { status: 500 },
    )
  }
}
