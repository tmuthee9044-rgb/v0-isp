import { type NextRequest, NextResponse } from "next/server"
import { RouterConnection, type RouterConnectionConfig } from "@/lib/router-connection"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { router_id } = body

    const sql = await getSql()

    // Fetch router configuration from database
    const [router] = await sql`
      SELECT id, vendor, hostname as host, api_port as port, username, password, 
             radius_secret, radius_nas_ip, connection_type, authentication_mode
      FROM network_devices
      WHERE id = ${router_id}
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const config: RouterConnectionConfig = {
      vendor: router.vendor,
      host: router.host,
      port: router.port || 8728,
      username: router.username,
      password: router.password,
      radius_secret: router.radius_secret,
      radius_nas_ip: router.radius_nas_ip,
      connection_method: router.connection_type || "api",
      authentication_mode: router.authentication_mode || "radius_only",
    }

    const connection = new RouterConnection(config)
    const health = await connection.healthCheck()

    // Log health check result
    await sql`
      INSERT INTO router_health_logs (router_id, status, latency_ms, cpu_usage, active_sessions, issues, checked_at)
      VALUES (${router_id}, ${health.status}, ${health.latency_ms}, ${health.cpu_usage || null}, 
              ${health.active_sessions || null}, ${JSON.stringify(health.issues)}, NOW())
    `.catch(() => {})

    return NextResponse.json(health)
  } catch (error: any) {
    console.error("[v0] Router health check error:", error)
    return NextResponse.json({ status: "critical", latency_ms: 0, issues: [error.message] }, { status: 500 })
  }
}
