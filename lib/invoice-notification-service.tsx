import { smsService } from "./sms-service"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface InvoiceNotificationData {
  invoiceId: number
  customerId: number
  customerName: string
  customerEmail?: string
  customerPhone?: string
  invoiceNumber: string
  amount: number
  dueDate: string
  companyName?: string
}

interface NotificationConfig {
  enableEmail: boolean
  enableSMS: boolean
  autoSendOnGeneration: boolean
  reminderDaysBefore: number[]
  emailTemplate?: string
  smsTemplate?: string
}

class InvoiceNotificationService {
  private config: NotificationConfig = {
    enableEmail: true,
    enableSMS: true,
    autoSendOnGeneration: true,
    reminderDaysBefore: [7, 3, 1], // Send reminders 7, 3, and 1 days before due date
  }

  async loadConfig(): Promise<void> {
    try {
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key LIKE 'invoice_notification_%'
      `

      settings.forEach((setting: any) => {
        const key = setting.key.replace("invoice_notification_", "")
        try {
          this.config[key as keyof NotificationConfig] = JSON.parse(setting.value)
        } catch {
          this.config[key as keyof NotificationConfig] = setting.value
        }
      })
    } catch (error) {
      console.error("Failed to load invoice notification config:", error)
    }
  }

  async sendInvoiceGeneratedNotification(data: InvoiceNotificationData): Promise<void> {
    try {
      await this.loadConfig()

      if (!this.config.autoSendOnGeneration) {
        console.log("[v0] Auto-send on generation is disabled")
        return
      }

      const promises = []

      if (this.config.enableEmail && data.customerEmail) {
        promises.push(this.sendEmailNotification(data, "invoice_generated"))
      }

      if (this.config.enableSMS && data.customerPhone) {
        promises.push(this.sendSMSNotification(data, "invoice_generated"))
      }

      await Promise.all(promises)

      // Log the notification
      await this.logNotification(data, "invoice_generated", "sent")

      console.log(`[v0] Invoice notifications sent for invoice ${data.invoiceNumber}`)
    } catch (error) {
      console.error("[v0] Failed to send invoice generated notification:", error)
      await this.logNotification(data, "invoice_generated", "failed", error.message)
    }
  }

  async sendPaymentReminderNotification(data: InvoiceNotificationData): Promise<void> {
    try {
      await this.loadConfig()

      const promises = []

      if (this.config.enableEmail && data.customerEmail) {
        promises.push(this.sendEmailNotification(data, "payment_reminder"))
      }

      if (this.config.enableSMS && data.customerPhone) {
        promises.push(this.sendSMSNotification(data, "payment_reminder"))
      }

      await Promise.all(promises)

      // Log the notification
      await this.logNotification(data, "payment_reminder", "sent")

      console.log(`[v0] Payment reminder sent for invoice ${data.invoiceNumber}`)
    } catch (error) {
      console.error("[v0] Failed to send payment reminder:", error)
      await this.logNotification(data, "payment_reminder", "failed", error.message)
    }
  }

  private async sendEmailNotification(
    data: InvoiceNotificationData,
    type: "invoice_generated" | "payment_reminder",
  ): Promise<void> {
    try {
      // Get company settings for email branding
      const companySettings = await this.getCompanySettings()

      const subject =
        type === "invoice_generated"
          ? `New Invoice ${data.invoiceNumber} - ${companySettings.company_name || "ISP Services"}`
          : `Payment Reminder - Invoice ${data.invoiceNumber} Due Soon`

      const emailContent = this.generateEmailContent(data, type, companySettings)

      // Send email using the existing email system
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.customerEmail,
          subject,
          html: emailContent,
          customerId: data.customerId,
          invoiceId: data.invoiceId,
          type: `invoice_${type}`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Email API returned ${response.status}`)
      }

      console.log(`[v0] Email sent successfully to ${data.customerEmail}`)
    } catch (error) {
      console.error("[v0] Failed to send email notification:", error)
      throw error
    }
  }

  private async sendSMSNotification(
    data: InvoiceNotificationData,
    type: "invoice_generated" | "payment_reminder",
  ): Promise<void> {
    try {
      const message = this.generateSMSContent(data, type)

      // Use the existing SMS service
      const success = await smsService.sendInvoiceNotification(data.customerPhone!, message)

      if (!success) {
        throw new Error("SMS service returned failure")
      }

      console.log(`[v0] SMS sent successfully to ${data.customerPhone}`)
    } catch (error) {
      console.error("[v0] Failed to send SMS notification:", error)
      throw error
    }
  }

  private generateEmailContent(
    data: InvoiceNotificationData,
    type: "invoice_generated" | "payment_reminder",
    companySettings: any,
  ): string {
    const companyName = companySettings.company_name || "ISP Services"
    const primaryColor = companySettings.branding_primary_color || "#2563eb"

    if (type === "invoice_generated") {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Invoice Generated</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: ${primaryColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .invoice-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: ${primaryColor}; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            <h2>New Invoice Generated</h2>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>A new invoice has been generated for your account. Please find the details below:</p>
            
            <div class="invoice-details">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
              <p><strong>Amount:</strong> <span class="amount">KES ${data.amount.toLocaleString()}</span></p>
              <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
            </div>
            
            <p>You can view and pay your invoice by logging into your customer portal:</p>
            <a href="${companySettings.customer_portal_url || "#"}" class="button">View Invoice & Pay Online</a>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact our support team.</p>
            
            <p>Thank you for choosing ${companyName}!</p>
          </div>
          <div class="footer">
            <p>${companyName} | ${companySettings.primary_email || "support@isp.com"} | ${companySettings.primary_phone || "+254 700 000 000"}</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `
    } else {
      const daysUntilDue = Math.ceil((new Date(data.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .invoice-details { background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .amount { font-size: 24px; font-weight: bold; color: #dc2626; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .urgent { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            <h2>Payment Reminder</h2>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p class="urgent">This is a friendly reminder that your invoice payment is due ${daysUntilDue > 0 ? `in ${daysUntilDue} day(s)` : "today"}.</p>
            
            <div class="invoice-details">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">KES ${data.amount.toLocaleString()}</span></p>
              <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
            </div>
            
            <p>To avoid any service interruption, please make your payment as soon as possible:</p>
            <a href="${companySettings.customer_portal_url || "#"}" class="button">Pay Now</a>
            
            <p>If you have already made this payment, please disregard this reminder. If you're experiencing financial difficulties, please contact our support team to discuss payment arrangements.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
          </div>
          <div class="footer">
            <p>${companyName} | ${companySettings.primary_email || "support@isp.com"} | ${companySettings.primary_phone || "+254 700 000 000"}</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `
    }
  }

  private generateSMSContent(data: InvoiceNotificationData, type: "invoice_generated" | "payment_reminder"): string {
    if (type === "invoice_generated") {
      return `New invoice ${data.invoiceNumber} generated for KES ${data.amount.toLocaleString()}. Due: ${new Date(data.dueDate).toLocaleDateString()}. Pay online at your customer portal or contact us for assistance. - ${data.companyName || "ISP Services"}`
    } else {
      const daysUntilDue = Math.ceil((new Date(data.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return `PAYMENT REMINDER: Invoice ${data.invoiceNumber} for KES ${data.amount.toLocaleString()} is due ${daysUntilDue > 0 ? `in ${daysUntilDue} day(s)` : "today"}. Pay now to avoid service interruption. - ${data.companyName || "ISP Services"}`
    }
  }

  private async getCompanySettings(): Promise<any> {
    try {
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key LIKE 'company_%' OR key LIKE 'branding_%' OR key LIKE 'contact_%'
      `

      const settingsObject: Record<string, any> = {}
      settings.forEach((setting: any) => {
        try {
          settingsObject[setting.key] = JSON.parse(setting.value)
        } catch {
          settingsObject[setting.key] = setting.value
        }
      })

      return settingsObject
    } catch (error) {
      console.error("Error fetching company settings:", error)
      return {}
    }
  }

  private async logNotification(
    data: InvoiceNotificationData,
    type: string,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO notification_logs (
          customer_id,
          invoice_id,
          notification_type,
          channel,
          recipient_email,
          recipient_phone,
          status,
          error_message,
          created_at
        ) VALUES (
          ${data.customerId},
          ${data.invoiceId},
          ${type},
          'email_sms',
          ${data.customerEmail || null},
          ${data.customerPhone || null},
          ${status},
          ${error || null},
          NOW()
        )
      `
    } catch (error) {
      console.error("Failed to log notification:", error)
    }
  }

  async schedulePaymentReminders(): Promise<void> {
    try {
      await this.loadConfig()

      // Find invoices that need reminders
      const invoicesNeedingReminders = await sql`
        SELECT 
          i.id as invoice_id,
          i.invoice_number,
          i.amount,
          i.due_date,
          i.customer_id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'pending'
          AND i.due_date >= CURRENT_DATE
          AND i.due_date <= CURRENT_DATE + INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM notification_logs nl 
            WHERE nl.invoice_id = i.id 
              AND nl.notification_type = 'payment_reminder'
              AND nl.created_at::date = CURRENT_DATE
          )
      `

      for (const invoice of invoicesNeedingReminders) {
        const daysUntilDue = Math.ceil(
          (new Date(invoice.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        )

        // Check if we should send a reminder for this number of days
        if (this.config.reminderDaysBefore.includes(daysUntilDue)) {
          await this.sendPaymentReminderNotification({
            invoiceId: invoice.invoice_id,
            customerId: invoice.customer_id,
            customerName: `${invoice.first_name} ${invoice.last_name}`,
            customerEmail: invoice.email,
            customerPhone: invoice.phone,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            dueDate: invoice.due_date,
          })
        }
      }
    } catch (error) {
      console.error("Failed to schedule payment reminders:", error)
    }
  }
}

export const invoiceNotificationService = new InvoiceNotificationService()
