import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, customerId, invoiceId, type } = await request.json()

    // Get email configuration
    const emailConfig = await getEmailConfig()

    if (!emailConfig.enabled) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 400 })
    }

    // In a real implementation, you would use nodemailer or similar
    // For now, we'll simulate sending and log the email
    console.log(`[v0] Sending email to ${to}`)
    console.log(`[v0] Subject: ${subject}`)

    // Log email in database
    await sql`
      INSERT INTO email_logs (
        recipient_email,
        subject,
        content,
        customer_id,
        invoice_id,
        email_type,
        status,
        created_at
      ) VALUES (
        ${to},
        ${subject},
        ${html},
        ${customerId || null},
        ${invoiceId || null},
        ${type || "general"},
        'sent',
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}

async function getEmailConfig() {
  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'email_%'
    `

    const config: any = { enabled: false }
    settings.forEach((setting: any) => {
      const key = setting.key.replace("email_", "")
      try {
        config[key] = JSON.parse(setting.value)
      } catch {
        config[key] = setting.value
      }
    })

    return config
  } catch (error) {
    console.error("Error fetching email config:", error)
    return { enabled: false }
  }
}
