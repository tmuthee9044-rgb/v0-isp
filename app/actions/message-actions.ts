"use server"

import { revalidatePath } from "next/cache"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface MessageTemplate {
  id: number
  name: string
  type: "email" | "sms"
  category: string
  subject?: string
  content: string
  variables: string[]
  created_at: string
  updated_at: string
  usage_count: number
  active: boolean
}

export interface Message {
  id: number
  type: "email" | "sms"
  recipient: string
  subject?: string
  content: string
  template_id?: number
  status: "pending" | "sent" | "delivered" | "failed" | "opened"
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  error_message?: string
  campaign_id?: number
  customer_id: number
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
  customer_email?: string
  customer_phone?: string
}

export interface MessageCampaign {
  id: number
  name: string
  description: string
  type: "email" | "sms" | "mixed"
  status: "draft" | "active" | "paused" | "completed"
  template_id?: number
  target_criteria: any
  scheduled_at?: string
  created_at: string
  updated_at: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  failed_count: number
}

async function getCommunicationSettings() {
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
        fromName: "Your ISP Company",
        fromEmail: "noreply@yourisp.com",
        replyTo: "support@yourisp.com",
        encryption: "tls",
        htmlEmails: true,
        emailTracking: false,
        autoRetry: true,
        emailQueue: true,
        maxRetries: 3,
        retryDelay: 5,
        batchSize: 50,
      },
      sms: {
        enabled: false,
        provider: "africastalking",
        username: "",
        apiKey: "",
        senderId: "YourISP",
        endpoint: "",
        deliveryReports: true,
        unicodeSupport: false,
        autoRetry: true,
        smsQueue: true,
        maxRetries: 3,
        retryDelay: 2,
        batchSize: 100,
        costPerMessage: 2.5,
        dailyLimit: 1000,
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
          reminderDays: 3,
          overdueFrequency: "daily",
          maintenanceNotice: 24,
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

    return commConfig
  } catch (error) {
    console.error("Error fetching communication settings:", error)
    // Return default settings if fetch fails
    return {
      email: { enabled: false, fromName: "Your ISP Company", fromEmail: "noreply@yourisp.com" },
      sms: { enabled: false, senderId: "YourISP" },
      notifications: {},
    }
  }
}

async function canSendMessage(type: "email" | "sms"): Promise<{ canSend: boolean; reason?: string }> {
  const settings = await getCommunicationSettings()

  // Check if message type is enabled
  if (!settings[type].enabled) {
    return { canSend: false, reason: `${type.toUpperCase()} messaging is disabled in communication settings` }
  }

  // Check quiet hours for SMS
  if (type === "sms" && settings.notifications?.timing?.quietHours) {
    const quietHours = settings.notifications.timing.quietHours
    const [startHour, endHour] = quietHours.split("-").map((h) => Number.parseInt(h))
    const currentHour = new Date().getHours()

    if (
      (startHour > endHour && (currentHour >= startHour || currentHour < endHour)) ||
      (startHour < endHour && currentHour >= startHour && currentHour < endHour)
    ) {
      return { canSend: false, reason: `SMS sending is disabled during quiet hours (${quietHours})` }
    }
  }

  return { canSend: true }
}

export async function getMessageTemplates(type?: "email" | "sms") {
  try {
    let templates
    if (type) {
      templates = await sql`
        SELECT id, name, template_type as type, subject, content, variables, 
               is_active as active, created_at, updated_at
        FROM message_templates 
        WHERE is_active = true AND template_type = ${type}
        ORDER BY created_at DESC
      `
    } else {
      templates = await sql`
        SELECT id, name, template_type as type, subject, content, variables, 
               is_active as active, created_at, updated_at
        FROM message_templates 
        WHERE is_active = true
        ORDER BY created_at DESC
      `
    }

    return { success: true, templates }
  } catch (error) {
    console.error("Error fetching message templates:", error)
    return { success: false, error: "Failed to fetch templates", templates: [] }
  }
}

export async function createMessageTemplate(data: FormData | any) {
  try {
    let name: string, type: "email" | "sms", subject: string, content: string

    if (data instanceof FormData) {
      name = data.get("name") as string
      type = data.get("type") as "email" | "sms"
      subject = data.get("subject") as string
      content = data.get("content") as string
    } else {
      name = data.name
      type = data.type
      subject = data.subject
      content = data.content
    }

    // Extract variables from content
    const variables = Array.from(content.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1])

    const result = await sql`
      INSERT INTO message_templates (name, template_type, subject, content, variables)
      VALUES (${name}, ${type}, ${type === "email" ? subject : null}, ${content}, ${JSON.stringify(variables)})
      RETURNING id, name, template_type as type, subject, content, variables, is_active as active, created_at, updated_at
    `

    revalidatePath("/messages")
    return { success: true, message: "Template created successfully", template: result[0] }
  } catch (error) {
    console.error("Error creating message template:", error)
    return { success: false, error: "Failed to create template" }
  }
}

export async function updateMessageTemplate(id: number, data: FormData | any) {
  try {
    let name: string, type: "email" | "sms", subject: string, content: string

    if (data instanceof FormData) {
      name = data.get("name") as string
      type = data.get("type") as "email" | "sms"
      subject = data.get("subject") as string
      content = data.get("content") as string
    } else {
      name = data.name
      type = data.type
      subject = data.subject
      content = data.content
    }

    // Extract variables from content
    const variables = Array.from(content.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1])

    await sql`
      UPDATE message_templates 
      SET name = ${name}, template_type = ${type}, 
          subject = ${type === "email" ? subject : null}, content = ${content}, 
          variables = ${JSON.stringify(variables)}, updated_at = NOW()
      WHERE id = ${id}
    `

    revalidatePath("/messages")
    return { success: true, message: "Template updated successfully" }
  } catch (error) {
    console.error("Error updating message template:", error)
    return { success: false, error: "Failed to update template" }
  }
}

export async function deleteMessageTemplate(id: number) {
  try {
    await sql`
      UPDATE message_templates 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `

    revalidatePath("/messages")
    return { success: true, message: "Template deleted successfully" }
  } catch (error) {
    console.error("Error deleting message template:", error)
    return { success: false, error: "Failed to delete template" }
  }
}

export async function sendMessage(formData: FormData) {
  try {
    const type = formData.get("type") as "email" | "sms"
    const recipients = JSON.parse(formData.get("recipients") as string) as number[]
    const subject = formData.get("subject") as string
    const content = formData.get("content") as string
    const templateId = formData.get("template_id") ? Number.parseInt(formData.get("template_id") as string) : null
    const campaignId = formData.get("campaign_id") ? Number.parseInt(formData.get("campaign_id") as string) : null

    const canSend = await canSendMessage(type)
    if (!canSend.canSend) {
      return { success: false, error: canSend.reason }
    }

    const settings = await getCommunicationSettings()

    // Get customer and employee details for recipients
    const [customers, employees] = await Promise.all([
      sql`SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ANY(${recipients})`,
      sql`SELECT id, first_name, last_name, email, phone FROM employees WHERE id = ANY(${recipients})`,
    ])

    const allRecipients = [...customers, ...employees]

    const batchSize = settings[type].batchSize || (type === "email" ? 50 : 100)
    if (recipients.length > batchSize) {
      return {
        success: false,
        error: `Batch size limit exceeded. Maximum ${batchSize} recipients allowed per ${type} batch.`,
      }
    }

    // Create message records with personalized content
    const messagePromises = allRecipients.map(async (recipient) => {
      const recipientAddress = type === "email" ? recipient.email : recipient.phone
      const recipientType = customers.includes(recipient) ? "customer" : "employee"

      // Replace variables in content for each recipient
      let personalizedContent = content
      let personalizedSubject = subject

      const variables = {
        customer_name: `${recipient.first_name} ${recipient.last_name}`,
        first_name: recipient.first_name,
        last_name: recipient.last_name,
        email: recipient.email,
        phone: recipient.phone,
        current_date: new Date().toLocaleDateString(),
        current_time: new Date().toLocaleTimeString(),
        company_name: settings.email.fromName || "Your ISP Company",
        support_email: settings.email.replyTo || "support@yourisp.com",
        support_phone: "+1-800-SUPPORT", // This could be added to settings
      }

      // Replace variables in content and subject
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
        personalizedContent = personalizedContent.replace(regex, value)
        if (personalizedSubject) {
          personalizedSubject = personalizedSubject.replace(regex, value)
        }
      })

      return sql`
        INSERT INTO messages (message_type, recipient_id, recipient_type, subject, content, template_id, status)
        VALUES (${type}, ${recipient.id}, ${recipientType}, ${type === "email" ? personalizedSubject : null}, ${personalizedContent}, ${templateId}, 'pending')
        RETURNING id
      `
    })

    const messageResults = await Promise.all(messagePromises)

    // Update template usage count if template was used
    if (templateId) {
      await sql`
        UPDATE message_templates 
        SET updated_at = NOW()
        WHERE id = ${templateId}
      `
    }

    const messageIds = messageResults.map((result) => result[0].id)

    if (settings[type].autoRetry && (settings[type].emailQueue || settings[type].smsQueue)) {
      // Messages will be processed by queue system
      await sql`
        UPDATE messages 
        SET status = 'pending', created_at = NOW()
        WHERE id = ANY(${messageIds})
      `
    } else {
      // Mark as sent immediately for non-queued messages
      await sql`
        UPDATE messages 
        SET status = 'sent', sent_at = NOW()
        WHERE id = ANY(${messageIds})
      `
    }

    revalidatePath("/messages")
    return {
      success: true,
      message: `${recipients.length} ${type} message(s) ${settings[type].emailQueue || settings[type].smsQueue ? "queued" : "sent"} successfully`,
      sent_count: recipients.length,
    }
  } catch (error) {
    console.error("Error sending messages:", error)
    return { success: false, error: "Failed to send messages" }
  }
}

export async function getMessageHistory(filters?: {
  type?: "email" | "sms"
  status?: string
  customer_id?: number
  campaign_id?: number
  date_from?: string
  date_to?: string
}) {
  try {
    let messages

    if (!filters || Object.keys(filters).length === 0) {
      messages = await sql`
        SELECT m.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone
        FROM messages m
        LEFT JOIN customers c ON m.recipient_id = c.id AND m.recipient_type = 'customer'
        ORDER BY m.created_at DESC 
        LIMIT 100
      `
    } else {
      let query = `
        SELECT m.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone
        FROM messages m
        LEFT JOIN customers c ON m.recipient_id = c.id AND m.recipient_type = 'customer'
        WHERE 1=1
      `

      const params: any[] = []

      if (filters.type) {
        query += ` AND m.message_type = $${params.length + 1}`
        params.push(filters.type)
      }
      if (filters.status) {
        query += ` AND m.status = $${params.length + 1}`
        params.push(filters.status)
      }
      if (filters.customer_id) {
        query += ` AND m.recipient_id = $${params.length + 1} AND m.recipient_type = 'customer'`
        params.push(filters.customer_id)
      }
      if (filters.date_from) {
        query += ` AND m.created_at >= $${params.length + 1}`
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ` AND m.created_at <= $${params.length + 1}`
        params.push(filters.date_to)
      }

      query += ` ORDER BY m.created_at DESC LIMIT 100`

      messages = await sql(query, params)
    }

    return { success: true, messages }
  } catch (error) {
    console.error("Error fetching message history:", error)
    return { success: false, error: "Failed to fetch message history", messages: [] }
  }
}

export async function createMessageCampaign(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const type = formData.get("type") as "email" | "sms" | "mixed"
    const templateId = formData.get("template_id") ? Number.parseInt(formData.get("template_id") as string) : undefined
    const targetCriteria = JSON.parse(formData.get("target_criteria") as string)
    const scheduledAt = formData.get("scheduled_at") as string

    // In production, this would create campaign in database
    const newCampaign: MessageCampaign = {
      id: Date.now(), // Mock ID
      name,
      description,
      type,
      status: "draft",
      template_id: templateId,
      target_criteria: targetCriteria,
      scheduled_at: scheduledAt || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      failed_count: 0,
    }

    console.log("Creating message campaign:", newCampaign)

    revalidatePath("/messages")
    return { success: true, message: "Campaign created successfully", campaign: newCampaign }
  } catch (error) {
    console.error("Error creating message campaign:", error)
    return { success: false, error: "Failed to create campaign" }
  }
}

export async function getMessageStats() {
  try {
    const [totalResult, todayResult, yesterdayResult, deliveryResult] = await Promise.all([
      sql`SELECT COUNT(*) as total FROM messages`,
      sql`SELECT COUNT(*) as today FROM messages WHERE DATE(created_at) = CURRENT_DATE`,
      sql`SELECT COUNT(*) as yesterday FROM messages WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'`,
      sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('delivered', 'opened') THEN 1 END) as delivered
        FROM messages 
        WHERE sent_at IS NOT NULL
      `,
    ])

    const total = Number.parseInt(totalResult[0].total)
    const today = Number.parseInt(todayResult[0].today)
    const yesterday = Number.parseInt(yesterdayResult[0].yesterday)
    const deliveryStats = deliveryResult[0]
    const deliveryRate = deliveryStats.total > 0 ? (deliveryStats.delivered / deliveryStats.total) * 100 : 0

    const stats = {
      total_messages: total,
      sent_today: today,
      sent_yesterday: yesterday,
      delivery_rate: Math.round(deliveryRate * 10) / 10,
      unread_count: 0, // This would require additional logic
    }

    return { success: true, stats }
  } catch (error) {
    console.error("Error fetching message stats:", error)
    return { success: false, error: "Failed to fetch stats" }
  }
}

export async function getCommunicationSettingsForMessages() {
  try {
    const settings = await getCommunicationSettings()
    return {
      success: true,
      settings: {
        emailEnabled: settings.email.enabled,
        smsEnabled: settings.sms.enabled,
        emailBatchSize: settings.email.batchSize,
        smsBatchSize: settings.sms.batchSize,
        quietHours: settings.notifications?.timing?.quietHours,
        fromName: settings.email.fromName,
        fromEmail: settings.email.fromEmail,
        senderId: settings.sms.senderId,
      },
    }
  } catch (error) {
    console.error("Error fetching communication settings for messages:", error)
    return { success: false, error: "Failed to fetch settings" }
  }
}

// Utility function to replace template variables
export async function replaceTemplateVariables(content: string, variables: Record<string, string>): Promise<string> {
  let result = content

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(regex, value)
  }

  return result
}

// Utility function to extract variables from template content
export async function extractTemplateVariables(content: string): Promise<string[]> {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g)
  return Array.from(matches, (m) => m[1])
}
