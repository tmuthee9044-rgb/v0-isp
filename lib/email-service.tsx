/**
 * Email Service for Trust Waves ISP
 * Handles email sending via SMTP with support for multiple providers
 * Integrates with communication settings from database
 */

import { getSql } from "@/lib/db"

interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  fromName: string
  fromEmail: string
  replyTo?: string
  encryption: "tls" | "ssl" | "none"
  enabled: boolean
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export class EmailService {
  private config: EmailConfig | null = null

  async loadConfig(): Promise<void> {
    const sql = await getSql()

    try {
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key LIKE 'communication.email.%'
      `

      const emailConfig: any = {
        enabled: false,
        smtpHost: "",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        fromName: "Trust Waves ISP",
        fromEmail: "",
        encryption: "tls",
      }

      settings.forEach((setting) => {
        const key = setting.key.replace("communication.email.", "")
        emailConfig[key] = JSON.parse(setting.value)
      })

      this.config = emailConfig as EmailConfig
    } catch (error) {
      console.error("[v0] Failed to load email config:", error)
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config) {
      await this.loadConfig()
    }

    if (!this.config || !this.config.enabled) {
      return {
        success: false,
        error: "Email service not configured or disabled",
      }
    }

    try {
      const nodemailer = await import("nodemailer")

      const transporter = nodemailer.default.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.encryption === "ssl",
        auth: {
          user: this.config.smtpUsername,
          pass: this.config.smtpPassword,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      })

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(", ") : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc) : undefined,
        replyTo: this.config.replyTo,
        attachments: options.attachments,
      }

      const info = await transporter.sendMail(mailOptions)

      // Log email delivery
      await this.logEmailDelivery({
        recipient: options.to,
        subject: options.subject,
        status: "sent",
        messageId: info.messageId,
        provider: this.config.smtpHost,
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Email sending failed"

      // Log email failure
      await this.logEmailDelivery({
        recipient: options.to,
        subject: options.subject,
        status: "failed",
        error: errorMessage,
        provider: this.config?.smtpHost || "unknown",
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async sendInvoiceEmail(
    customerEmail: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .invoice-details { background: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice ${invoiceNumber}</h1>
            </div>
            <div class="content">
              <p>Dear valued customer,</p>
              <p>Your invoice for this billing period is now available.</p>
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> KES ${amount.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${dueDate}</p>
              </div>
              <p>Please make payment by the due date to avoid service interruption.</p>
              <a href="https://portal.trustwavesnetwork.com/invoices" class="button">View Invoice</a>
            </div>
            <div class="footer">
              <p>Trust Waves ISP | support@trustwavesnetwork.com</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const result = await this.sendEmail({
      to: customerEmail,
      subject: `Invoice ${invoiceNumber} - Amount Due: KES ${amount.toFixed(2)}`,
      html,
    })

    return result.success
  }

  async sendPaymentConfirmation(customerEmail: string, amount: number, invoiceNumber: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .payment-details { background: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Received</h1>
            </div>
            <div class="content">
              <p>Dear valued customer,</p>
              <p>We have successfully received your payment. Thank you!</p>
              <div class="payment-details">
                <p><strong>Amount Paid:</strong> KES ${amount.toFixed(2)}</p>
                <p><strong>Invoice:</strong> ${invoiceNumber}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Your service will continue uninterrupted. A receipt has been sent to your email.</p>
            </div>
            <div class="footer">
              <p>Trust Waves ISP | support@trustwavesnetwork.com</p>
            </div>
          </div>
        </body>
      </html>
    `

    const result = await this.sendEmail({
      to: customerEmail,
      subject: `Payment Confirmation - KES ${amount.toFixed(2)}`,
      html,
    })

    return result.success
  }

  private async logEmailDelivery(logData: any): Promise<void> {
    const sql = await getSql()

    try {
      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          ${logData.status === "sent" ? "INFO" : "ERROR"},
          'email',
          ${`Email ${logData.status}: ${logData.subject}`},
          ${JSON.stringify(logData)},
          NOW()
        )
      `
    } catch (error) {
      console.error("[v0] Failed to log email delivery:", error)
    }
  }
}

export const emailService = new EmailService()
