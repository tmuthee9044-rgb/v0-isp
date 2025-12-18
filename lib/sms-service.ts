/**
 * SMS Service for Trust Waves ISP
 * Supports multiple SMS providers: Africa's Talking, Twilio, TextLocal
 * Integrates with communication settings from database
 */

import { getSql } from "@/lib/db"

interface SMSProvider {
  name: string
  sendSMS: (to: string, message: string) => Promise<{ success: boolean; messageId?: string; error?: string }>
}

interface SMSConfig {
  provider: string
  apiKey: string
  username?: string
  senderId: string
  enabled: boolean
  endpoint?: string
}

class SMSService {
  private config: SMSConfig | null = null
  private providers: Map<string, SMSProvider> = new Map()

  constructor() {
    // Register SMS providers
    this.registerProvider("africastalking", new AfricasTalkingProvider())
    this.registerProvider("twilio", new TwilioProvider())
    this.registerProvider("textlocal", new TextLocalProvider())
  }

  private registerProvider(name: string, provider: SMSProvider) {
    this.providers.set(name, provider)
  }

  async loadConfig(): Promise<void> {
    const sql = await getSql()

    try {
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key LIKE 'communication.sms.%'
      `

      const smsConfig: any = {
        enabled: false,
        provider: "africastalking",
        apiKey: "",
        senderId: "TRUSTWAVES",
      }

      settings.forEach((setting) => {
        const key = setting.key.replace("communication.sms.", "")
        smsConfig[key] = JSON.parse(setting.value)
      })

      this.config = smsConfig as SMSConfig
    } catch (error) {
      console.error("[v0] Failed to load SMS config:", error)
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config) {
      await this.loadConfig()
    }

    if (!this.config || !this.config.enabled) {
      return {
        success: false,
        error: "SMS service not configured or disabled",
      }
    }

    const provider = this.providers.get(this.config.provider)
    if (!provider) {
      return {
        success: false,
        error: `SMS provider '${this.config.provider}' not found`,
      }
    }

    try {
      const result = await provider.sendSMS(to, message)

      if (result.success) {
        await this.logSMSDelivery({
          recipient: to,
          message,
          status: "sent",
          messageId: result.messageId,
          provider: this.config.provider,
        })
      } else {
        await this.logSMSDelivery({
          recipient: to,
          message,
          status: "failed",
          error: result.error,
          provider: this.config.provider,
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "SMS sending failed"

      await this.logSMSDelivery({
        recipient: to,
        message,
        status: "failed",
        error: errorMessage,
        provider: this.config.provider,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async sendPaymentReminder(customerPhone: string, amount: number, dueDate: string): Promise<boolean> {
    const message = `Trust Waves ISP: Your payment of KES ${amount.toFixed(2)} is due on ${dueDate}. Pay via MPESA Paybill 123456, Account: YOUR_ACCOUNT. Thank you!`
    const result = await this.sendSMS(customerPhone, message)
    return result.success
  }

  async sendPaymentConfirmation(customerPhone: string, amount: number, invoiceNumber: string): Promise<boolean> {
    const message = `Trust Waves ISP: Payment of KES ${amount.toFixed(2)} received for Invoice ${invoiceNumber}. Thank you! Your service continues.`
    const result = await this.sendSMS(customerPhone, message)
    return result.success
  }

  async sendServiceAlert(customerPhone: string, alertType: string, details: string): Promise<boolean> {
    const message = `Trust Waves ISP Alert: ${alertType} - ${details}. Contact support: 0700123456`
    const result = await this.sendSMS(customerPhone, message)
    return result.success
  }

  private async logSMSDelivery(logData: any): Promise<void> {
    const sql = await getSql()

    try {
      await sql`
        INSERT INTO system_logs (level, category, message, details, created_at)
        VALUES (
          ${logData.status === "sent" ? "INFO" : "ERROR"},
          'sms',
          ${`SMS ${logData.status} to ${logData.recipient}`},
          ${JSON.stringify(logData)},
          NOW()
        )
      `
    } catch (error) {
      console.error("[v0] Failed to log SMS delivery:", error)
    }
  }
}

class AfricasTalkingProvider implements SMSProvider {
  name = "africastalking"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sql = await getSql()

    try {
      // Get API credentials from database
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key IN ('communication.sms.apiKey', 'communication.sms.username', 'communication.sms.senderId')
      `

      const config: any = {}
      settings.forEach((s) => {
        const key = s.key.split(".").pop()
        config[key] = JSON.parse(s.value)
      })

      if (!config.apiKey || !config.username) {
        return { success: false, error: "Africa's Talking credentials not configured" }
      }

      // Real API call to Africa's Talking
      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: config.apiKey,
          Accept: "application/json",
        },
        body: new URLSearchParams({
          username: config.username,
          to: to,
          message: message,
          from: config.senderId || "TRUSTWAVES",
        }),
      })

      const result = await response.json()

      if (result.SMSMessageData?.Recipients?.[0]?.status === "Success") {
        return {
          success: true,
          messageId: result.SMSMessageData.Recipients[0].messageId,
        }
      } else {
        return {
          success: false,
          error: result.SMSMessageData?.Recipients?.[0]?.status || "Africa's Talking API error",
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Africa's Talking request failed",
      }
    }
  }
}

class TwilioProvider implements SMSProvider {
  name = "twilio"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sql = await getSql()

    try {
      // Get Twilio credentials from database
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key IN ('communication.sms.apiKey', 'communication.sms.username', 'communication.sms.senderId')
      `

      const config: any = {}
      settings.forEach((s) => {
        const key = s.key.split(".").pop()
        config[key] = JSON.parse(s.value)
      })

      if (!config.apiKey || !config.username) {
        return { success: false, error: "Twilio credentials not configured" }
      }

      // Real API call to Twilio
      const accountSid = config.username
      const authToken = config.apiKey

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: config.senderId,
          Body: message,
        }),
      })

      const result = await response.json()

      if (result.sid) {
        return {
          success: true,
          messageId: result.sid,
        }
      } else {
        return {
          success: false,
          error: result.message || "Twilio API error",
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Twilio request failed",
      }
    }
  }
}

class TextLocalProvider implements SMSProvider {
  name = "textlocal"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sql = await getSql()

    try {
      const settings = await sql`
        SELECT key, value 
        FROM system_config 
        WHERE key IN ('communication.sms.apiKey', 'communication.sms.senderId')
      `

      const config: any = {}
      settings.forEach((s) => {
        const key = s.key.split(".").pop()
        config[key] = JSON.parse(s.value)
      })

      if (!config.apiKey) {
        return { success: false, error: "TextLocal API key not configured" }
      }

      const response = await fetch("https://api.textlocal.in/send/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          apikey: config.apiKey,
          numbers: to,
          message: message,
          sender: config.senderId || "TXTWAV",
        }),
      })

      const result = await response.json()

      if (result.status === "success") {
        return {
          success: true,
          messageId: result.message_id?.[0],
        }
      } else {
        return {
          success: false,
          error: result.errors?.[0]?.message || "TextLocal API error",
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "TextLocal request failed",
      }
    }
  }
}

export const smsService = new SMSService()
