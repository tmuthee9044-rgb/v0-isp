import { NextResponse } from "next/server"
import { neon } from "@vercel/postgres"
import {
  validateMikroTikFirewall,
  validateUbiquitiFirewall,
  validateJuniperFirewall,
  generateFirewallReport,
} from "@/lib/firewall-validator"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const routerId = Number.parseInt(params.id)

    // Get router details
    const routers = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    // Get RADIUS server from system config or router settings
    const radiusConfig = await sql`
      SELECT value FROM system_config WHERE key = 'server.radius.primary_ip'
    `
    const radiusServer =
      radiusConfig[0]?.value || router.nas_ip_address || "10.0.0.1"

    const mgmtIp = process.env.MGMT_IP || "10.0.0.0/24"

    let validation
    let report

    if (router.type === "mikrotik") {
      // For real implementation, fetch actual firewall rules from router via API
      // For now, check if ISP_MANAGED rules exist in notes/logs
      const mockRules = [] // Would fetch from router API

      validation = await validateMikroTikFirewall(
        radiusServer,
        mgmtIp,
        mockRules
      )
      report = generateFirewallReport(validation)
    } else if (router.type === "ubiquiti") {
      const mockRules = [] // Would fetch from router SSH
      validation = await validateUbiquitiFirewall(radiusServer, mockRules)
      report = generateFirewallReport(validation)
    } else if (router.type === "juniper") {
      const mockPolicies = [] // Would fetch from router NETCONF
      validation = await validateJuniperFirewall(mockPolicies)
      report = generateFirewallReport(validation)
    } else {
      return NextResponse.json(
        { error: "Unsupported router type" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      routerId,
      routerName: router.name,
      routerType: router.type,
      validation,
      report,
    })
  } catch (error) {
    console.error("[v0] Firewall check error:", error)
    return NextResponse.json(
      { error: "Failed to check firewall rules" },
      { status: 500 }
    )
  }
}
