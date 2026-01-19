import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { RouterComplianceChecker } from "@/lib/router-compliance"

export const dynamic = "force-dynamic"

/**
 * Get compliance status for a router
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const routerId = Number.parseInt(params.id)

    const compliance =
      await RouterComplianceChecker.getRouterCompliance(routerId)

    if (!compliance) {
      return NextResponse.json(
        { error: "No compliance data found. Run a compliance check first." },
        { status: 404 },
      )
    }

    return NextResponse.json(compliance)
  } catch (error) {
    console.error("[v0] Error fetching compliance:", error)
    return NextResponse.json(
      { error: "Failed to fetch compliance status" },
      { status: 500 },
    )
  }
}

/**
 * Run compliance check on a router
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const routerId = Number.parseInt(params.id)
    const sql = await getSql()

    // Get router details
    const routers = await sql`
      SELECT id, ip_address, type, username, password, api_port
      FROM network_devices
      WHERE id = ${routerId}
    `

    if (routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    if (router.type !== "mikrotik") {
      return NextResponse.json(
        { error: `Compliance checking not yet supported for ${router.type}` },
        { status: 400 },
      )
    }

    // Get RADIUS IP
    const radiusConfig = await sql`
      SELECT value FROM system_config WHERE key = 'radius_server_ip'
    `
    const radiusIp = radiusConfig[0]?.value || "127.0.0.1"

    // Run compliance check
    const result = await RouterComplianceChecker.checkMikroTikCompliance(
      router.id,
      router.ip_address,
      router.username,
      router.password,
      router.api_port || 8728,
      radiusIp,
    )

    // Save result
    await RouterComplianceChecker.saveComplianceResult(result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error checking compliance:", error)
    return NextResponse.json(
      { error: "Failed to check router compliance" },
      { status: 500 },
    )
  }
}
