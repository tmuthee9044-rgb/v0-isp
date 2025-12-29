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
      }>
    >`
      SELECT id, name, ip_address, radius_secret, nas_ip_address, status
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
          SELECT id, nasname as name, nasidentifier, secret
          FROM nas
          WHERE nasidentifier = ${router.nas_ip_address || router.ip_address}
          LIMIT 1
        `

        routerResult.tests.nasRegistration = {
          success: nasClients.length > 0,
          registered: nasClients.length > 0,
          nasName: nasClients[0]?.name || nasClients[0]?.nasname || null,
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
          WHERE nasidentifier = ${router.nas_ip_address || router.ip_address}
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

      // Test 6: Test RADIUS authentication with a test user
      try {
        const testResult = await testRadiusServer(radiusHost, Number(radiusPort), radiusSecret, 5000)

        routerResult.tests.radiusAuth = {
          success: testResult.success,
          responseTime: testResult.responseTime,
          status: testResult.success ? "RADIUS server responding" : "RADIUS server not responding",
          message: testResult.message,
        }
      } catch (error) {
        routerResult.tests.radiusAuth = {
          success: false,
          status: "RADIUS test failed",
          error: String(error),
        }
      }

      // Overall status
      const allTestsPassed =
        routerResult.tests.ping?.success &&
        routerResult.tests.nasRegistration?.success &&
        routerResult.tests.secretMatch?.success &&
        routerResult.tests.radiusAuth?.success

      routerResult.overallStatus = allTestsPassed ? "Connected" : "Issues Detected"
      routerResult.readyForProduction = allTestsPassed

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
