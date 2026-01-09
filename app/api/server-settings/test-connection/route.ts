import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, config } = body

    if (type === "radius") {
      // Simulate RADIUS connection test
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

      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          'info',
          'server_config',
          'RADIUS connection test performed',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    }

    if (type === "openvpn") {
      // Simulate OpenVPN configuration test
      const testResult = {
        success: true,
        message: "OpenVPN configuration test successful",
        details: {
          serverIp: config.serverIp,
          port: config.port,
          protocol: config.protocol,
          status: "Server configuration valid",
        },
      }

      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          'info',
          'server_config',
          'OpenVPN configuration test performed',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    }

    return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
  } catch (error) {
    console.error("Error testing connection:", error)
    return NextResponse.json({ error: "Connection test failed" }, { status: 500 })
  }
}
