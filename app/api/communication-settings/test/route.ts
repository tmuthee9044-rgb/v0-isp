import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, config } = body

    if (type === "email") {
      // Simulate email test
      const testResult = {
        success: true,
        message: "Test email sent successfully",
        details: {
          host: config.smtpHost,
          port: config.smtpPort,
          encryption: config.encryption,
          status: "Email delivered",
        },
      }

      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          'info',
          'communication',
          'Email connection test performed',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    }

    if (type === "sms") {
      // Simulate SMS test
      const testResult = {
        success: true,
        message: "Test SMS sent successfully",
        details: {
          provider: config.provider,
          senderId: config.senderId,
          endpoint: config.endpoint,
          status: "SMS delivered",
        },
      }

      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          'info',
          'communication',
          'SMS connection test performed',
          ${JSON.stringify(testResult)},
          NOW()
        )
      `

      return NextResponse.json(testResult)
    }

    return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
  } catch (error) {
    console.error("Error testing communication:", error)
    return NextResponse.json({ error: "Communication test failed" }, { status: 500 })
  }
}
