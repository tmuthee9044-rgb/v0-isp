import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { testRadiusServer } from "@/lib/radius-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    const sql = await getSql()

    if (type === "radius") {
      const config = body.config

      if (!config.host || !config.authPort || !config.secret) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing required fields: host, authPort, and secret are required",
          },
          { status: 400 },
        )
      }

      const testResult = await testRadiusServer(
        config.host,
        Number.parseInt(config.authPort),
        config.secret,
        5000, // 5 second timeout
      )

      // Log the test
      const logLevel = testResult.success ? "INFO" : "ERROR"
      await sql`
        INSERT INTO system_logs (level, source, category, message, details, created_at)
        VALUES (
          ${logLevel},
          'RADIUS Server',
          'server_config',
          ${testResult.success ? "RADIUS connection test successful" : "RADIUS connection test failed"},
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    } else if (type === "openvpn") {
      const config = body.config

      if (!config.host || !config.port) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing required fields: host and port are required",
          },
          { status: 400 },
        )
      }

      // For OpenVPN, we can only check if the port is reachable
      // Full OpenVPN testing requires certificate setup
      const testResult = {
        success: false,
        message: "OpenVPN testing requires manual verification with certificates",
        details: {
          host: config.host,
          port: config.port,
          protocol: config.protocol,
          status: "Manual verification required",
        },
      }

      const logLevel = "INFO"
      await sql`
        INSERT INTO system_logs (level, source, category, message, details, created_at)
        VALUES (
          ${logLevel},
          'OpenVPN Server',
          'server_config',
          'OpenVPN connection test requested',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    }

    return NextResponse.json({ success: false, message: "Invalid connection type" }, { status: 400 })
  } catch (error) {
    console.error("Error testing connection:", error)
    return NextResponse.json(
      { success: false, message: "Connection test failed", error: String(error) },
      { status: 500 },
    )
  }
}
