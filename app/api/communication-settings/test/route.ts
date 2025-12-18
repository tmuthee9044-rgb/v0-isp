import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { smsService } from "@/lib/sms-service"

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    const body = await request.json()
    const { type, config } = body

    if (type === "email") {
      // Test real SMTP connection
      try {
        const nodemailer = await import("nodemailer")

        const transporter = nodemailer.default.createTransporter({
          host: config.smtpHost,
          port: Number.parseInt(config.smtpPort),
          secure: config.encryption === "ssl",
          auth: {
            user: config.smtpUsername,
            pass: config.smtpPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        })

        // Verify connection
        await transporter.verify()

        // Send test email
        const info = await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: config.smtpUsername, // Send test to self
          subject: "Trust Waves ISP - Email Test",
          html: `
            <h2>Email Configuration Test Successful</h2>
            <p>Your SMTP settings are working correctly!</p>
            <ul>
              <li><strong>SMTP Host:</strong> ${config.smtpHost}</li>
              <li><strong>Port:</strong> ${config.smtpPort}</li>
              <li><strong>Encryption:</strong> ${config.encryption.toUpperCase()}</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          `,
        })

        await sql`
          INSERT INTO system_logs (level, category, message, details, created_at)
          VALUES (
            'INFO',
            'communication',
            'Email connection test successful',
            ${JSON.stringify({ host: config.smtpHost, messageId: info.messageId })},
            NOW()
          )
        `

        return NextResponse.json({
          success: true,
          message: "Test email sent successfully! Check your inbox.",
          details: {
            host: config.smtpHost,
            port: config.smtpPort,
            encryption: config.encryption,
            messageId: info.messageId,
          },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "SMTP connection failed"

        await sql`
          INSERT INTO system_logs (level, category, message, details, created_at)
          VALUES (
            'ERROR',
            'communication',
            'Email connection test failed',
            ${JSON.stringify({ error: errorMessage, config: { host: config.smtpHost, port: config.smtpPort } })},
            NOW()
          )
        `

        return NextResponse.json({
          success: false,
          message: `Email test failed: ${errorMessage}`,
          details: { error: errorMessage },
        })
      }
    }

    if (type === "sms") {
      // Test real SMS connection
      try {
        // Temporarily update config
        await sql`
          INSERT INTO system_config (key, value, created_at)
          VALUES 
            ('communication.sms.provider', ${JSON.stringify(config.provider)}, NOW()),
            ('communication.sms.apiKey', ${JSON.stringify(config.apiKey)}, NOW()),
            ('communication.sms.username', ${JSON.stringify(config.username || "")}, NOW()),
            ('communication.sms.senderId', ${JSON.stringify(config.senderId)}, NOW()),
            ('communication.sms.enabled', ${JSON.stringify(true)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `

        // Reload SMS config
        await smsService.loadConfig()

        // Send test SMS (use a test number or the configured support number)
        const testPhone = config.testPhone || "+254700000000"
        const result = await smsService.sendSMS(
          testPhone,
          `Trust Waves ISP: SMS test successful! Your ${config.provider} integration is working. Time: ${new Date().toLocaleTimeString()}`,
        )

        if (result.success) {
          await sql`
            INSERT INTO system_logs (level, category, message, details, created_at)
            VALUES (
              'INFO',
              'communication',
              'SMS connection test successful',
              ${JSON.stringify({ provider: config.provider, messageId: result.messageId })},
              NOW()
            )
          `

          return NextResponse.json({
            success: true,
            message: `Test SMS sent successfully via ${config.provider}!`,
            details: {
              provider: config.provider,
              senderId: config.senderId,
              messageId: result.messageId,
            },
          })
        } else {
          throw new Error(result.error || "SMS sending failed")
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "SMS connection failed"

        await sql`
          INSERT INTO system_logs (level, category, message, details, created_at)
          VALUES (
            'ERROR',
            'communication',
            'SMS connection test failed',
            ${JSON.stringify({ error: errorMessage, provider: config.provider })},
            NOW()
          )
        `

        return NextResponse.json({
          success: false,
          message: `SMS test failed: ${errorMessage}`,
          details: { error: errorMessage },
        })
      }
    }

    return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
  } catch (error) {
    console.error("Error testing communication:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Communication test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
