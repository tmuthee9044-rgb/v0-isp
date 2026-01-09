import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'communication.%'
    `

    const commConfig = {
      email: {
        enabled: false,
        smtpHost: "",
        smtpPort: "587",
        smtpUsername: "",
        smtpPassword: "",
        fromName: "",
        fromEmail: "",
        replyTo: "",
        encryption: "tls",
        htmlEmails: true,
        emailTracking: false,
        autoRetry: true,
        emailQueue: true,
        maxRetries: "3",
        retryDelay: "5",
        batchSize: "50",
      },
      sms: {
        enabled: false,
        provider: "africastalking",
        username: "",
        apiKey: "",
        senderId: "",
        endpoint: "",
        deliveryReports: true,
        unicodeSupport: false,
        autoRetry: true,
        smsQueue: true,
        maxRetries: "3",
        retryDelay: "2",
        batchSize: "100",
        costPerMessage: "2.50",
        dailyLimit: "1000",
        budgetAlerts: true,
      },
      notifications: {
        paymentReminders: { email: true, sms: true },
        paymentConfirmations: { email: true, sms: true },
        serviceActivation: { email: true, sms: false },
        serviceSuspension: { email: true, sms: true },
        maintenanceAlerts: { email: true, sms: false },
        staffNotifications: {
          newCustomer: { enabled: true },
          paymentFailures: { enabled: true },
          supportTickets: { enabled: true },
          systemAlerts: { enabled: true },
        },
        timing: {
          reminderDays: "3",
          overdueFrequency: "daily",
          maintenanceNotice: "24",
          quietHours: "22-06",
        },
      },
    }

    settings.forEach((setting) => {
      const keys = setting.key.replace("communication.", "").split(".")
      const value = JSON.parse(setting.value)

      if (keys[0] === "email") {
        commConfig.email[keys[1]] = value
      } else if (keys[0] === "sms") {
        commConfig.sms[keys[1]] = value
      } else if (keys[0] === "notifications") {
        if (keys[1] === "timing") {
          commConfig.notifications.timing[keys[2]] = value
        } else if (keys[1] === "staffNotifications") {
          commConfig.notifications.staffNotifications[keys[2]] = value
        } else {
          commConfig.notifications[keys[1]] = value
        }
      }
    })

    return NextResponse.json(commConfig)
  } catch (error) {
    console.error("Error fetching communication settings:", error)
    return NextResponse.json({ error: "Failed to fetch communication settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, settings } = body

    if (type === "email") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, created_at)
          VALUES (${`communication.email.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}
        `
      }
    }

    if (type === "sms") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, created_at)
          VALUES (${`communication.sms.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}
        `
      }
    }

    if (type === "notifications") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, created_at)
          VALUES (${`communication.notifications.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}
        `
      }
    }

    if (type === "all") {
      const allSettings = settings as any

      // Save email settings
      if (allSettings.email) {
        for (const [key, value] of Object.entries(allSettings.email)) {
          await sql`
            INSERT INTO system_config (key, value, created_at)
            VALUES (${`communication.email.${key}`}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = ${JSON.stringify(value)}
          `
        }
      }

      // Save SMS settings
      if (allSettings.sms) {
        for (const [key, value] of Object.entries(settings)) {
          await sql`
            INSERT INTO system_config (key, value, created_at)
            VALUES (${`communication.sms.${key}`}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = ${JSON.stringify(value)}
          `
        }
      }

      // Save notification settings
      if (allSettings.notifications) {
        for (const [key, value] of Object.entries(allSettings.notifications)) {
          await sql`
            INSERT INTO system_config (key, value, created_at)
            VALUES (${`communication.notifications.${key}`}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = ${JSON.stringify(value)}
          `
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating communication settings:", error)
    return NextResponse.json({ error: "Failed to update communication settings" }, { status: 500 })
  }
}
