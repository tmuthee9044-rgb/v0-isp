import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { RouterAutoProvisioner } from "@/lib/router-auto-provision"

export const dynamic = "force-dynamic"

/**
 * Generate auto-provision script for a router
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const routerId = Number.parseInt(params.id)
    const sql = await getSql()

    // Get router details
    const routers = await sql`
      SELECT id, ip_address, type, name
      FROM network_devices
      WHERE id = ${routerId}
    `

    if (routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    // Get RADIUS configuration from system config
    const radiusConfig = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('radius_server_ip', 'radius_secret', 'management_ip', 'safe_dns_enabled')
    `

    const config: Record<string, string> = {}
    for (const row of radiusConfig) {
      config[row.key] = row.value
    }

    const radiusIp = config.radius_server_ip || "127.0.0.1"
    const radiusSecret = config.radius_secret || "testing123"
    const mgmtIp = config.management_ip
    const safeDNS = config.safe_dns_enabled === "true"

    // Generate provisioning script
    const script = RouterAutoProvisioner.generateScript({
      routerId: router.id,
      routerIp: router.ip_address,
      radiusIp,
      radiusSecret,
      mgmtIp,
      safeDNS,
      vendor: router.type,
    })

    return new NextResponse(script, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${router.name || `router-${routerId}`}-provision.${router.type === "mikrotik" ? "rsc" : "sh"}"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating provision script:", error)
    return NextResponse.json(
      { error: "Failed to generate provision script" },
      { status: 500 },
    )
  }
}

/**
 * Apply auto-provision script to router (for background workers)
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
      SELECT id, ip_address, type, username, password, api_port, ssh_port
      FROM network_devices
      WHERE id = ${routerId}
    `

    if (routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    // TODO: Implement actual script execution based on vendor
    // For now, return success with message about manual application

    return NextResponse.json({
      success: true,
      message:
        "Auto-provision script generated. Please apply manually or use background worker.",
      routerId,
      vendor: router.type,
    })
  } catch (error) {
    console.error("[v0] Error applying provision script:", error)
    return NextResponse.json(
      { error: "Failed to apply provision script" },
      { status: 500 },
    )
  }
}
