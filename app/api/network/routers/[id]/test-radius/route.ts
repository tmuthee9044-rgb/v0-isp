import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { testRadiusServer } from "@/lib/radius-client"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = getSql()
    const routerId = params.id

    // Get router details
    const [router] = await sql`
      SELECT id, name, ip_address, hostname, radius_secret, radius_nas_ip,
             api_username, api_password, api_port
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

    let serverToRouterPing = false
    try {
      const { exec } = require("child_process")
      const { promisify } = require("util")
      const execPromise = promisify(exec)

      const pingCommand =
        process.platform === "win32" ? `ping -n 3 ${router.ip_address}` : `ping -c 3 -W 2 ${router.ip_address}`

      const { stdout, stderr } = await execPromise(pingCommand)
      serverToRouterPing = stdout.includes("ttl=") || stdout.includes("TTL=")

      tests.push({
        name: "Server → Router (Ping)",
        status: serverToRouterPing ? "success" : "failed",
        message: serverToRouterPing
          ? `Server can reach router at ${router.ip_address}`
          : `Server cannot ping router at ${router.ip_address}`,
        details: {
          routerIP: router.ip_address,
          reachable: serverToRouterPing,
        },
      })
    } catch (error: any) {
      tests.push({
        name: "Server → Router (Ping)",
        status: "failed",
        message: `Ping test failed: ${error.message}`,
        details: { error: error.message },
      })
    }

    let routerToRadiusPing = false
    let routerRadiusConfig: any = null
    try {
      const mikrotik = await createMikroTikClient(Number.parseInt(routerId))

      if (mikrotik) {
        // Test ping from router to RADIUS server
        const pingResult = await mikrotik.execute(`/ping address=${radius.host} count=3`)
        routerToRadiusPing = pingResult.success

        // Get RADIUS configuration from router
        const radiusConfigResult = await mikrotik.execute("/radius/print")
        if (radiusConfigResult.success && radiusConfigResult.data) {
          routerRadiusConfig = Array.isArray(radiusConfigResult.data)
            ? radiusConfigResult.data
            : [radiusConfigResult.data]
        }

        await mikrotik.disconnect()

        tests.push({
          name: "Router → RADIUS Server (Ping)",
          status: routerToRadiusPing ? "success" : "failed",
          message: routerToRadiusPing
            ? `Router can reach RADIUS server at ${radius.host}`
            : `Router cannot ping RADIUS server at ${radius.host}`,
          details: {
            radiusHost: radius.host,
            reachable: routerToRadiusPing,
          },
        })
      } else {
        tests.push({
          name: "Router → RADIUS Server (Ping)",
          status: "warning",
          message: "Cannot connect to router API to test RADIUS reachability",
          details: { error: "Router API connection failed" },
        })
      }
    } catch (error: any) {
      tests.push({
        name: "Router → RADIUS Server (Ping)",
        status: "warning",
        message: `Cannot test router connectivity: ${error.message}`,
        details: { error: error.message },
      })
    }

    // Test 3: RADIUS Server Connectivity from management system
    const radiusTest = await testRadiusServer(radius.host, Number.parseInt(radius.authPort), radius.sharedSecret, 5000)

    tests.push({
      name: "RADIUS Server Authentication",
      status: radiusTest.success ? "success" : "failed",
      message: radiusTest.message,
      details: radiusTest.details,
    })

    if (routerRadiusConfig && routerRadiusConfig.length > 0) {
      const radiusServers = routerRadiusConfig.map((cfg: any) => ({
        address: cfg.address,
        service: cfg.service,
        port: cfg["authentication-port"] || cfg.port,
        secret: cfg.secret ? "***configured***" : "NOT SET",
      }))

      const isConfigured = radiusServers.some((srv: any) => srv.address === radius.host)

      tests.push({
        name: "Router RADIUS Configuration",
        status: isConfigured ? "success" : "warning",
        message: isConfigured
          ? `RADIUS server ${radius.host} is configured on router`
          : `RADIUS server ${radius.host} NOT found in router config`,
        details: {
          configuredServers: radiusServers,
          expectedServer: radius.host,
        },
      })
    } else {
      tests.push({
        name: "Router RADIUS Configuration",
        status: "warning",
        message: "Could not retrieve RADIUS configuration from router",
      })
    }

    // Test 5: Router Configuration Check
    const configCheck = {
      name: "Database Configuration",
      status: "info",
      checks: [],
    }

    if (!router.radius_secret) {
      configCheck.checks.push({
        item: "RADIUS Secret",
        status: "warning",
        message: "Not configured in database",
      })
    } else if (router.radius_secret === radius.sharedSecret) {
      configCheck.checks.push({
        item: "RADIUS Secret",
        status: "success",
        message: "Matches RADIUS server configuration",
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

    // Test 6: Check if router is in NAS clients
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

    const recentActivity = await sql`
      SELECT COUNT(*) as count, MAX(created_at) as last_activity
      FROM radius_sessions_active
      WHERE nas_ip_address = ${router.radius_nas_ip || router.ip_address}
    `

    if (recentActivity[0].count > 0) {
      tests.push({
        name: "RADIUS Activity",
        status: "success",
        message: `Router has ${recentActivity[0].count} active sessions`,
        details: {
          activeSessions: recentActivity[0].count,
          lastActivity: recentActivity[0].last_activity,
        },
      })
    } else {
      // Check archived sessions
      const archivedActivity = await sql`
        SELECT COUNT(*) as count, MAX(stop_time) as last_session
        FROM radius_sessions_archive
        WHERE nas_ip_address = ${router.radius_nas_ip || router.ip_address}
        LIMIT 1
      `

      if (archivedActivity[0].count > 0) {
        tests.push({
          name: "RADIUS Activity",
          status: "info",
          message: "No active sessions, but has session history",
          details: {
            totalHistoricalSessions: archivedActivity[0].count,
            lastSession: archivedActivity[0].last_session,
          },
        })
      } else {
        tests.push({
          name: "RADIUS Activity",
          status: "warning",
          message: "No RADIUS sessions detected from this router",
          details: {
            note: "Router may not have sent any authentication requests yet",
          },
        })
      }
    }

    // Test 8: Check for active RADIUS users
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

    const bidirectionalConnected = serverToRouterPing && routerToRadiusPing
    const overallStatus = bidirectionalConnected ? "success" : "warning"

    // Generate MikroTik configuration
    const mikrotikConfig = {
      commands: [
        `# Add RADIUS server`,
        `/radius add service=ppp,login address=${radius.host} secret=${router.radius_secret || "YOUR_SECRET"} authentication-port=${radius.authPort} accounting-port=${radius.acctPort}`,
        ``,
        `# Enable RADIUS authentication`,
        `/ppp aaa set use-radius=yes`,
        ``,
        `# Test RADIUS connectivity from router`,
        `/ping ${radius.host} count=5`,
        ``,
        `# Check RADIUS status`,
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
        'Bidirectional RADIUS connectivity test performed',
        ${JSON.stringify({
          router_id: routerId,
          router_name: router.name,
          bidirectional_connectivity: bidirectionalConnected,
          tests,
        })},
        'router-radius-test'
      )
    `

    return NextResponse.json({
      success: bidirectionalConnected,
      overallStatus,
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
      connectivity: {
        serverToRouter: serverToRouterPing,
        routerToRadius: routerToRadiusPing,
        bidirectional: bidirectionalConnected,
      },
      tests,
      mikrotikConfig,
    })
  } catch (error) {
    console.error("RADIUS test error:", error)
    return NextResponse.json({ error: "Failed to test RADIUS connectivity" }, { status: 500 })
  }
}
