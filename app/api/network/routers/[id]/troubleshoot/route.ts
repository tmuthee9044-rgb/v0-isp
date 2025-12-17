import { type NextRequest, NextResponse } from "next/server"
import { createMikroTikClient } from "@/lib/mikrotik-api"
import { getSql } from "@/lib/db"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    console.log(`[v0] Starting troubleshooting for router ${routerId}`)

    const sql = await getSql()
    const routers = await sql`SELECT * FROM network_devices WHERE id = ${routerId}`

    if (!routers || routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]
    const diagnostics: any = {
      routerId: router.id,
      routerName: router.name,
      hostname: router.ip_address,
      timestamp: new Date().toISOString(),
      tests: [],
    }

    // Test 1: Network Connectivity (Ping)
    console.log(`[v0] Test 1: Pinging ${router.ip_address}`)
    const pingTest: any = {
      name: "Network Connectivity (ICMP Ping)",
      status: "running",
    }

    try {
      const { stdout: pingOutput } = await execAsync(`ping -c 4 -W 2 ${router.ip_address}`)
      const packetLossMatch = pingOutput.match(/(\d+)% packet loss/)
      const timeMatch = pingOutput.match(/time=([0-9.]+) ms/)

      pingTest.status = "success"
      pingTest.details = {
        packetLoss: packetLossMatch ? `${packetLossMatch[1]}%` : "Unknown",
        avgTime: timeMatch ? `${timeMatch[1]} ms` : "Unknown",
        rawOutput: pingOutput,
      }
      pingTest.success = true
    } catch (error: any) {
      pingTest.status = "failed"
      pingTest.error = "Host unreachable or ping failed"
      pingTest.details = { error: error.message }
      pingTest.success = false
    }
    diagnostics.tests.push(pingTest)

    // Test 2: HTTP/REST API Port Check
    console.log(`[v0] Test 2: Checking HTTP REST API port`)
    const portTest: any = {
      name: "HTTP REST API Port (80/443)",
      status: "running",
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const mikrotikUser = router.configuration?.mikrotik_user || router.api_username || router.username || "admin"
      const mikrotikPassword = router.configuration?.mikrotik_password || router.api_password || router.password

      const httpUrl = `http://${router.ip_address}/rest/system/resource`
      const response = await fetch(httpUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${mikrotikUser}:${mikrotikPassword}`).toString("base64")}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      portTest.status = response.ok ? "success" : "failed"
      portTest.details = {
        httpStatusCode: response.status,
        httpStatusText: response.statusText,
        accessible: response.ok || response.status === 401, // 401 means port is open but auth failed
      }
      portTest.success = response.ok || response.status === 401
    } catch (error: any) {
      portTest.status = "failed"
      portTest.error = "Cannot connect to REST API port"
      portTest.details = {
        error: error.message,
        suggestion: "Ensure MikroTik REST API is enabled: /ip service enable www",
      }
      portTest.success = false
    }
    diagnostics.tests.push(portTest)

    // Test 3: Authentication Test
    console.log(`[v0] Test 3: Testing authentication`)
    const authTest: any = {
      name: "MikroTik API Authentication",
      status: "running",
    }

    try {
      const client = await createMikroTikClient(routerId)

      if (!client) {
        throw new Error("Failed to create MikroTik client")
      }

      authTest.status = "success"
      authTest.details = {
        username: router.api_username || router.configuration?.mikrotik_user,
        authenticated: true,
        connectionType: "REST API",
      }
      authTest.success = true

      await client.disconnect()
    } catch (error: any) {
      authTest.status = "failed"
      authTest.error = "Authentication failed"
      authTest.details = {
        error: error.message,
        username: router.api_username || router.configuration?.mikrotik_user,
        suggestion: "Verify username and password are correct in MikroTik user database",
      }
      authTest.success = false
    }
    diagnostics.tests.push(authTest)

    // Test 4: System Resource Query
    console.log(`[v0] Test 4: Querying system resources`)
    const resourceTest: any = {
      name: "System Resource Query",
      status: "running",
    }

    try {
      const client = await createMikroTikClient(routerId)

      if (!client) {
        throw new Error("Failed to create MikroTik client")
      }

      const resources = await client.getSystemResources()

      if (!resources.success) {
        throw new Error(resources.error || "Failed to get system resources")
      }

      const data = resources.data || {}
      resourceTest.status = "success"
      resourceTest.details = {
        boardName: data["board-name"] || "Unknown",
        version: data.version || "Unknown",
        uptime: data.uptime || "Unknown",
        cpuLoad: data["cpu-load"] || "Unknown",
        freeMemory: data["free-memory"] || "Unknown",
        totalMemory: data["total-memory"] || "Unknown",
      }
      resourceTest.success = true

      await client.disconnect()
    } catch (error: any) {
      resourceTest.status = "failed"
      resourceTest.error = "Cannot query system resources"
      resourceTest.details = { error: error.message }
      resourceTest.success = false
    }
    diagnostics.tests.push(resourceTest)

    // Test 5: Identity Check
    console.log(`[v0] Test 5: Checking router identity`)
    const identityTest: any = {
      name: "Router Identity Check",
      status: "running",
    }

    try {
      const client = await createMikroTikClient(routerId)

      if (!client) {
        throw new Error("Failed to create MikroTik client")
      }

      const identity = await client.getIdentity()

      if (!identity.success) {
        throw new Error(identity.error || "Failed to get identity")
      }

      const data = identity.data || {}
      identityTest.status = "success"
      identityTest.details = {
        identity: data.name || "Unknown",
        matches: data.name === router.name,
      }
      identityTest.success = true

      await client.disconnect()
    } catch (error: any) {
      identityTest.status = "failed"
      identityTest.error = "Cannot retrieve router identity"
      identityTest.details = { error: error.message }
      identityTest.success = false
    }
    diagnostics.tests.push(identityTest)

    // Calculate overall status
    const allSuccess = diagnostics.tests.every((test: any) => test.success)
    const anySuccess = diagnostics.tests.some((test: any) => test.success)

    diagnostics.overallStatus = allSuccess ? "healthy" : anySuccess ? "partial" : "failed"
    diagnostics.summary = {
      total: diagnostics.tests.length,
      passed: diagnostics.tests.filter((t: any) => t.success).length,
      failed: diagnostics.tests.filter((t: any) => !t.success).length,
    }

    console.log(`[v0] Troubleshooting complete: ${diagnostics.overallStatus}`)

    await sql`
      INSERT INTO activity_logs (entity_type, entity_id, action, details, created_at) 
      VALUES ('router', ${routerId}, 'troubleshoot', ${JSON.stringify(diagnostics)}, NOW())
    `

    return NextResponse.json(diagnostics)
  } catch (error: any) {
    console.error("[v0] Troubleshooting error:", error)
    return NextResponse.json({ error: "Troubleshooting failed", details: error.message }, { status: 500 })
  }
}
