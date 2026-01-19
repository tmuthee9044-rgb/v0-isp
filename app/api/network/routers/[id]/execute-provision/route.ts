import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { RouterAutoProvision } from "@/lib/router-auto-provision"
import { executeProvisionScript, testRouterConnection, checkExistingProvision } from "@/lib/router-api-worker"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const routerId = Number.parseInt(params.id)

    if (!sql) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    // Get router details
    const routers = await sql`
      SELECT 
        id, name, ip_address, type, username, password,
        radius_server, radius_secret, radius_server_secondary, radius_secret_secondary,
        management_ip
      FROM routers 
      WHERE id = ${routerId}
    `

    if (!routers.length) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    // Test connectivity first
    console.log(`[v0] Testing connectivity to router ${router.name} (${router.ip_address})`)
    const isOnline = await testRouterConnection({
      ip: router.ip_address,
      username: router.username,
      password: router.password,
      vendor: router.type,
    })

    if (!isOnline) {
      return NextResponse.json(
        { error: "Router is unreachable. Check network connectivity." },
        { status: 503 }
      )
    }

    // Check if already provisioned
    const alreadyProvisioned = await checkExistingProvision({
      ip: router.ip_address,
      username: router.username,
      password: router.password,
      vendor: router.type,
    })

    // Generate provision script
    const provisionScript = RouterAutoProvision.generateScript({
      routerId: router.id,
      routerIp: router.ip_address,
      radiusIp: router.radius_server,
      radiusSecret: router.radius_secret,
      radiusIpSecondary: router.radius_server_secondary,
      radiusSecretSecondary: router.radius_secret_secondary,
      mgmtIp: router.management_ip,
      safeDNS: true,
      vendor: router.type,
    })

    // Execute on physical router
    console.log(`[v0] Executing provision script on ${router.type} router ${router.name}`)
    const result = await executeProvisionScript(
      {
        ip: router.ip_address,
        username: router.username,
        password: router.password,
        vendor: router.type,
      },
      provisionScript
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Provisioning failed",
          details: result.error,
          alreadyProvisioned,
        },
        { status: 500 }
      )
    }

    // Update router status
    await sql`
      UPDATE routers 
      SET 
        compliance_status = 'green',
        last_compliance_check = NOW(),
        compliance_notes = 'Auto-provisioned successfully'
      WHERE id = ${routerId}
    `

    // Log the execution
    await sql`
      INSERT INTO router_compliance_history (
        router_id, overall_status, radius_auth, radius_acct, radius_coa,
        interim_updates, dns_ok, fasttrack_safe, security_hardened,
        issues, checked_at
      ) VALUES (
        ${routerId}, 'green', true, true, true,
        true, true, true, true,
        'Auto-provisioned', NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: `Router ${router.name} provisioned successfully`,
      alreadyProvisioned,
      output: result.output,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error("[v0] Error executing provision:", error)
    return NextResponse.json(
      { error: "Provisioning execution failed", details: String(error) },
      { status: 500 }
    )
  }
}
