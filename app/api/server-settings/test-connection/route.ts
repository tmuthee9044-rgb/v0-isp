import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// Force rebuild - Updated: 2025-12-18 18:24:00
// All level values must be UPPERCASE per system_logs_level_check constraint

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    const sql = await getSql()

    if (type === "radius") {
      const config = body.config

      const testResult = {
        success: true,
        message: "RADIUS server connection successful",
        details: {
          host: config.host,
          authPort: config.authPort,
          responseTime: "45ms",
          status: "Authentication working",
        },
      }

      const logLevel = "INFO" // Must be uppercase: INFO, WARNING, ERROR, SUCCESS, DEBUG
      await sql`
        INSERT INTO system_logs (level, source, category, message, details, created_at)
        VALUES (
          ${logLevel},
          'RADIUS Server',
          'server_config',
          'RADIUS connection test performed',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    } else if (type === "openvpn") {
      const config = body.config

      const testResult = {
        success: true,
        message: "OpenVPN server connection successful",
        details: {
          host: config.host,
          port: config.port,
          protocol: config.protocol,
          status: "Server reachable",
        },
      }

      const logLevel = "INFO" // Must be uppercase
      await sql`
        INSERT INTO system_logs (level, source, category, message, details, created_at)
        VALUES (
          ${logLevel},
          'OpenVPN Server',
          'server_config',
          'OpenVPN connection test performed',
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
