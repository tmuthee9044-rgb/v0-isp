import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { testRadiusServer } from "@/lib/radius-client"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = getSql()
    const routerId = params.id

    // Get router details
    const [router] = await sql`
      SELECT id, name, ip_address, hostname, radius_secret, radius_nas_ip
      FROM network_devices
      WHERE id = ${routerId}
      LIMIT 1
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    // Get RADIUS server settings
    const radiusSettings = await sql`
      SELECT config_value
      FROM system_config
      WHERE config_key = 'radius_settings'
      LIMIT 1
    `

    if (!radiusSettings.length || !radiusSettings[0].config_value) {
      return NextResponse.json(
        { error: "RADIUS server not configured. Please configure in Settings → Servers" },
        { status: 400 },
      )
    }

    const radius = radiusSettings[0].config_value

    if (!radius.enabled) {
      return NextResponse.json({ error: "RADIUS server is disabled" }, { status: 400 })
    }

    const tests = []

    // Test 1: RADIUS Server Connectivity
    const radiusTest = await testRadiusServer(radius.host, Number.parseInt(radius.authPort), radius.sharedSecret, 5000)

    tests.push({
      name: "RADIUS Server Connectivity",
      status: radiusTest.success ? "success" : "failed",
      message: radiusTest.message,
      details: radiusTest.details,
    })

    // Test 2: Router Configuration Check
    const configCheck = {
      name: "Router Configuration",
      status: "info",
      checks: [],
    }

    if (!router.radius_secret) {
      configCheck.checks.push({
        item: "RADIUS Secret",
        status: "warning",
        message: "Not configured on router",
      })
    } else if (router.radius_secret === radius.sharedSecret) {
      configCheck.checks.push({
        item: "RADIUS Secret",
        status: "success",
        message: "Matches server configuration",
      })
    } else {
      configCheck.checks.push({
        item: "RADIUS Secret",
        status: "error",
        message: "Does NOT match server secret",
      })
    }

    if (!router.radius_nas_ip) {
      configCheck.checks.push({
        item: "NAS IP Address",
        status: "warning",
        message: "Not configured",
      })
    } else {
      configCheck.checks.push({
        item: "NAS IP Address",
        status: "success",
        message: `Configured as ${router.radius_nas_ip}`,
      })
    }

    tests.push(configCheck)

    // Test 3: Check if router is in NAS clients
    const nasClient = await sql`
      SELECT nasname, shortname, secret
      FROM radius_nas
      WHERE nasname = ${router.radius_nas_ip || router.ip_address}
      LIMIT 1
    `

    tests.push({
      name: "NAS Client Registration",
      status: nasClient.length > 0 ? "success" : "warning",
      message: nasClient.length > 0 ? "Router is registered in RADIUS NAS clients" : "Router not found in NAS clients",
      details: nasClient.length > 0 ? nasClient[0] : null,
    })

    // Test 4: Check for active RADIUS users
    const activeUsers = await sql`
      SELECT COUNT(*) as count
      FROM radius_users
      WHERE is_active = true
      LIMIT 1
    `

    tests.push({
      name: "RADIUS Users",
      status: "info",
      message: `${activeUsers[0].count} active users configured`,
    })

    // Generate MikroTik configuration
    const mikrotikConfig = {
      commands: [
        `# Add RADIUS server`,
        `/radius add service=ppp,login address=${radius.host} secret=${router.radius_secret || "YOUR_SECRET"} authentication-port=${radius.authPort} accounting-port=${radius.acctPort}`,
        ``,
        `# Enable RADIUS authentication`,
        `/ppp aaa set use-radius=yes`,
        ``,
        `# Test RADIUS connectivity`,
        `/radius incoming print`,
      ],
      testCommand: `/ping ${radius.host} count=5`,
    }

    // Log the test
    await sql`
      INSERT INTO system_logs (level, category, message, details, source)
      VALUES (
        'INFO',
        'radius',
        'RADIUS connectivity test performed',
        ${JSON.stringify({ router_id: routerId, router_name: router.name, tests })},
        'router-radius-test'
      )
    `

    return NextResponse.json({
      success: radiusTest.success,
      router: {
        id: router.id,
        name: router.name,
        ip: router.ip_address,
      },
      radiusServer: {
        host: radius.host,
        authPort: radius.authPort,
        acctPort: radius.acctPort,
      },
      tests,
      mikrotikConfig,
    })
  } catch (error) {
    console.error("RADIUS test error:", error)
    return NextResponse.json({ error: "Failed to test RADIUS connectivity" }, { status: 500 })
  }
}
