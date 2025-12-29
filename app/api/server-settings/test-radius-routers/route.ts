import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { testRadiusServer } from "@/lib/radius-client"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { radiusHost, radiusPort, radiusSecret } = body

    console.log("[v0] Testing RADIUS routers with config:", { radiusHost, radiusPort })

    if (!radiusHost || !radiusPort || !radiusSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required RADIUS configuration",
        },
        { status: 400 },
      )
    }

    const sql = await getSql()

    console.log("[v0] Querying for active routers...")

    const routers = await sql<
      Array<{
        id: number
        name: string
        ip_address: string
        radius_secret: string | null
        nas_ip_address: string | null
        status: string
        api_port: number | null
        api_username: string | null
        api_password: string | null
      }>
    >`
      SELECT id, name, ip_address, radius_secret, nas_ip_address, status, 
             api_port, api_username, api_password
      FROM network_devices
      WHERE (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other')
        OR type ILIKE '%router%')
      AND status = 'active'
      ORDER BY name
    `

    console.log("[v0] Found routers:", routers.length)
    if (routers.length > 0) {
      console.log(
        "[v0] Router details:",
        routers.map((r) => ({ id: r.id, name: r.name, ip: r.ip_address })),
      )
    }

    if (routers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active routers found in database",
        results: [],
        hint: "Add routers in /network/routers first",
      })
    }

    const results = []

    for (const router of routers) {
      console.log("[v0] Testing router:", router.name, router.ip_address)

      const routerResult: any = {
        routerId: router.id,
        routerName: router.name,
        routerIp: router.ip_address,
        nasIp: router.nas_ip_address,
        tests: {},
      }

      // Test 1: Ping router from RADIUS server
      try {
        const { stdout } = await execAsync(`ping -c 4 -W 2 ${router.ip_address}`)
        const packetLoss = stdout.match(/(\d+)% packet loss/)?.[1] || "100"
        const avgTime = stdout.match(/min\/avg\/max\/[^=]+=\s*[\d.]+\/([\d.]+)\//)?.[1]

        routerResult.tests.ping = {
          success: packetLoss !== "100",
          packetLoss: `${packetLoss}%`,
          avgTime: avgTime ? `${avgTime} ms` : "N/A",
          status: packetLoss === "0" ? "Excellent" : packetLoss === "100" ? "Failed" : "Poor",
        }
      } catch (error) {
        routerResult.tests.ping = {
          success: false,
          status: "Failed",
          error: "Router unreachable",
        }
      }

      // Test 2: Check if router is registered as NAS client
      try {
        const nasClients = await sql`
          SELECT id, nasname, shortname, secret
          FROM nas
          WHERE nasname = ${router.nas_ip_address || router.ip_address}
          LIMIT 1
        `

        routerResult.tests.nasRegistration = {
          success: nasClients.length > 0,
          registered: nasClients.length > 0,
          nasName: nasClients[0]?.nasname || null,
          secretConfigured: nasClients.length > 0 && !!nasClients[0]?.secret,
        }
      } catch (error) {
        console.error("[v0] Error checking NAS registration:", error)
        routerResult.tests.nasRegistration = {
          success: false,
          registered: false,
          error: "nas table may not exist - run FreeRADIUS schema migration",
        }
      }

      // Test 3: Check RADIUS secret match
      if (router.radius_secret && routerResult.tests.nasRegistration?.registered) {
        const nasClients = await sql`
          SELECT secret
          FROM nas
          WHERE nasname = ${router.nas_ip_address || router.ip_address}
          LIMIT 1
        `

        routerResult.tests.secretMatch = {
          success: router.radius_secret === nasClients[0]?.secret,
          match: router.radius_secret === nasClients[0]?.secret,
          message:
            router.radius_secret === nasClients[0]?.secret
              ? "RADIUS secrets match"
              : "RADIUS secrets mismatch - update router or database",
        }
      } else if (!router.radius_secret) {
        routerResult.tests.secretMatch = {
          success: false,
          match: false,
          message: "RADIUS secret not configured in network_devices table",
        }
      } else {
        routerResult.tests.secretMatch = {
          success: false,
          match: false,
          message: "Router not registered in RADIUS nas table",
        }
      }

      // Test 4: Check for active sessions from this router
      try {
        const sessions = await sql`
          SELECT COUNT(*) as count
          FROM radacct
          WHERE nasipaddress = ${router.nas_ip_address || router.ip_address}
          AND acctstoptime IS NULL
        `

        routerResult.tests.activeSessions = {
          success: true,
          count: Number(sessions[0]?.count || 0),
          status: Number(sessions[0]?.count || 0) > 0 ? "Router has active sessions" : "No active sessions",
        }
      } catch (error) {
        console.error("[v0] Error checking active sessions:", error)
        routerResult.tests.activeSessions = {
          success: false,
          count: 0,
          status: "radacct table may not exist",
          error: "Run FreeRADIUS schema migration",
        }
      }

      // Test 5: Check recent RADIUS accounting records
      try {
        const recentAccounting = await sql`
          SELECT COUNT(*) as count
          FROM radacct
          WHERE nasipaddress = ${router.nas_ip_address || router.ip_address}
          AND acctstarttime > NOW() - INTERVAL '1 hour'
        `

        routerResult.tests.recentAccounting = {
          success: true,
          count: Number(recentAccounting[0]?.count || 0),
          status:
            Number(recentAccounting[0]?.count || 0) > 0
              ? "Router is sending accounting data"
              : "No recent accounting records (past hour)",
        }
      } catch (error) {
        console.error("[v0] Error checking accounting:", error)
        routerResult.tests.recentAccounting = {
          success: false,
          count: 0,
          status: "radacct table may not exist",
          error: "Run FreeRADIUS schema migration",
        }
      }

      // Test 6: Verify router can be reached from RADIUS server perspective
      try {
        const { stdout } = await execAsync(`ping -c 2 -W 1 ${router.ip_address}`)
        const reachable = !stdout.includes("100% packet loss")

        routerResult.tests.radiusToRouterReachability = {
          success: reachable,
          status: reachable ? "Router reachable from RADIUS server" : "Router unreachable from RADIUS server",
          message: reachable
            ? "FreeRADIUS can send packets to router"
            : "Network issue - router cannot receive RADIUS requests",
        }
      } catch (error) {
        routerResult.tests.radiusToRouterReachability = {
          success: false,
          status: "Failed to test reachability",
          error: String(error),
        }
      }

      // Test 7: Check if router has RADIUS configuration via API
      if (router.api_username && router.api_password && router.ip_address) {
        try {
          const radiusConfigUrl = `http://${router.ip_address}:${router.api_port || 8728}/rest/radius/print`
          const authString = Buffer.from(`${router.api_username}:${router.api_password}`).toString("base64")

          const response = await fetch(radiusConfigUrl, {
            method: "GET",
            headers: {
              Authorization: `Basic ${authString}`,
            },
            signal: AbortSignal.timeout(5000),
          })

          if (response.ok) {
            const radiusServers = await response.json()
            const hasThisRadius = radiusServers.some(
              (server: any) =>
                server.address === radiusHost || server.address === radiusHost.replace("http://", "").split(":")[0],
            )

            routerResult.tests.routerRadiusConfig = {
              success: hasThisRadius,
              configured: hasThisRadius,
              serversCount: radiusServers.length,
              status: hasThisRadius
                ? "Router is configured to use this RADIUS server"
                : "Router not configured for this RADIUS server",
              message: hasThisRadius
                ? "Two-way RADIUS communication confirmed"
                : "Add this RADIUS server to router configuration",
            }
          } else {
            routerResult.tests.routerRadiusConfig = {
              success: false,
              configured: false,
              status: "Could not query router RADIUS config",
              error: `HTTP ${response.status}`,
            }
          }
        } catch (error) {
          routerResult.tests.routerRadiusConfig = {
            success: false,
            configured: false,
            status: "Router API not accessible",
            message: "Cannot verify router RADIUS configuration - API credentials may be incorrect",
          }
        }
      } else {
        routerResult.tests.routerRadiusConfig = {
          success: false,
          configured: false,
          status: "Router API credentials not configured",
          message: "Add router API credentials to verify RADIUS configuration",
        }
      }

      // Test 8: Test actual RADIUS authentication to this specific router
      try {
        const testResult = await testRadiusServer(
          radiusHost,
          Number(radiusPort),
          radiusSecret,
          5000,
          router.nas_ip_address || router.ip_address,
        )

        routerResult.tests.radiusAuthToRouter = {
          success: testResult.success,
          responseTime: testResult.responseTime,
          status: testResult.success
            ? "RADIUS server can authenticate for this router"
            : "RADIUS authentication failed for this router",
          message: testResult.message,
          details: testResult.details,
        }
      } catch (error) {
        routerResult.tests.radiusAuthToRouter = {
          success: false,
          status: "RADIUS authentication test failed",
          error: String(error),
        }
      }

      // Overall status
      const allTestsPassed =
        routerResult.tests.ping?.success &&
        routerResult.tests.nasRegistration?.success &&
        routerResult.tests.secretMatch?.success &&
        routerResult.tests.radiusToRouterReachability?.success &&
        routerResult.tests.radiusAuthToRouter?.success

      routerResult.overallStatus = allTestsPassed ? "Fully Connected" : "Issues Detected"
      routerResult.readyForProduction = allTestsPassed && routerResult.tests.routerRadiusConfig?.success !== false

      results.push(routerResult)
    }

    try {
      await sql`
        INSERT INTO system_logs (level, source, category, message, details, created_at)
        VALUES (
          'INFO',
          'RADIUS Server',
          'troubleshooting',
          'RADIUS-to-routers connectivity test completed',
          ${JSON.stringify({ testedRouters: routers.length, results })},
          NOW()
        )
      `
    } catch (error) {
      console.error("[v0] Error logging test results:", error)
      // Continue anyway - logging failure shouldn't stop the test
    }

    return NextResponse.json({
      success: true,
      message: `Tested ${routers.length} router(s)`,
      results,
      totalRouters: routers.length,
    })
  } catch (error) {
    console.error("[v0] Error testing RADIUS router connectivity:", error)
    return NextResponse.json(
      {
        success: false,
        message: "RADIUS router test failed",
        error: String(error),
        hint: "Check console logs for details",
      },
      { status: 500 },
    )
  }
}
