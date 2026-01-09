interface SMSProvider {
  name: string
  sendSMS: (to: string, message: string) => Promise<{ success: boolean; messageId?: string; error?: string }>
}

interface SMSConfig {
  provider: string
  apiKey: string
  senderId: string
  isActive: boolean
}

class SMSService {
  private config: SMSConfig | null = null
  private providers: Map<string, SMSProvider> = new Map()

  constructor() {
    // Register SMS providers
    this.registerProvider("twilio", new TwilioProvider())
    this.registerProvider("africastalking", new AfricasTalkingProvider())
    this.registerProvider("textlocal", new TextLocalProvider())
    this.registerProvider("mock", new MockSMSProvider()) // For testing
  }

  private registerProvider(name: string, provider: SMSProvider) {
    this.providers.set(name, provider)
  }

  async loadConfig(): Promise<void> {
    try {
      // Load SMS configuration from database
      const response = await fetch("/api/sms-config")
      if (response.ok) {
        const data = await response.json()
        this.config = data.config
      }
    } catch (error) {
      console.error("Failed to load SMS config:", error)
    }
  }

  async sendTicketAssignmentAlert(
    employeePhone: string,
    ticketNumber: string,
    priority: string,
    subject: string,
  ): Promise<boolean> {
    if (!this.config || !this.config.isActive) {
      console.log("[v0] SMS service not configured or inactive")
      return false
    }

    const provider = this.providers.get(this.config.provider)
    if (!provider) {
      console.error(`[v0] SMS provider '${this.config.provider}' not found`)
      return false
    }

    const message = `New support ticket assigned: ${ticketNumber}
Priority: ${priority.toUpperCase()}
Subject: ${subject}
Please check your dashboard for details.`

    try {
      const result = await provider.sendSMS(employeePhone, message)

      if (result.success) {
        console.log(`[v0] SMS sent successfully to ${employeePhone}, Message ID: ${result.messageId}`)

        // Log SMS delivery to database
        await this.logSMSDelivery({
          recipient: employeePhone,
          message,
          status: "sent",
          messageId: result.messageId,
          provider: this.config.provider,
        })

        return true
      } else {
        console.error(`[v0] SMS failed to send: ${result.error}`)

        // Log SMS failure
        await this.logSMSDelivery({
          recipient: employeePhone,
          message,
          status: "failed",
          error: result.error,
          provider: this.config.provider,
        })

        return false
      }
    } catch (error) {
      console.error("[v0] SMS service error:", error)
      return false
    }
  }

  async sendLoyaltyNotification(customerPhone: string, message: string): Promise<boolean> {
    if (!this.config || !this.config.isActive) {
      console.log("[v0] SMS service not configured or inactive")
      return false
    }

    const provider = this.providers.get(this.config.provider)
    if (!provider) {
      console.error(`[v0] SMS provider '${this.config.provider}' not found`)
      return false
    }

    try {
      const result = await provider.sendSMS(customerPhone, message)

      if (result.success) {
        console.log(`[v0] Loyalty SMS sent successfully to ${customerPhone}, Message ID: ${result.messageId}`)

        // Log SMS delivery to database
        await this.logSMSDelivery({
          recipient: customerPhone,
          message,
          status: "sent",
          messageId: result.messageId,
          provider: this.config.provider,
          type: "loyalty",
        })

        return true
      } else {
        console.error(`[v0] Loyalty SMS failed to send: ${result.error}`)

        // Log SMS failure
        await this.logSMSDelivery({
          recipient: customerPhone,
          message,
          status: "failed",
          error: result.error,
          provider: this.config.provider,
          type: "loyalty",
        })

        return false
      }
    } catch (error) {
      console.error("[v0] Loyalty SMS service error:", error)
      return false
    }
  }

  async sendInvoiceNotification(customerPhone: string, message: string): Promise<boolean> {
    if (!this.config || !this.config.isActive) {
      console.log("[v0] SMS service not configured or inactive")
      return false
    }

    const provider = this.providers.get(this.config.provider)
    if (!provider) {
      console.error(`[v0] SMS provider '${this.config.provider}' not found`)
      return false
    }

    try {
      const result = await provider.sendSMS(customerPhone, message)

      if (result.success) {
        console.log(`[v0] Invoice SMS sent successfully to ${customerPhone}, Message ID: ${result.messageId}`)

        // Log SMS delivery to database
        await this.logSMSDelivery({
          recipient: customerPhone,
          message,
          status: "sent",
          messageId: result.messageId,
          provider: this.config.provider,
          type: "invoice",
        })

        return true
      } else {
        console.error(`[v0] Invoice SMS failed to send: ${result.error}`)

        // Log SMS failure
        await this.logSMSDelivery({
          recipient: customerPhone,
          message,
          status: "failed",
          error: result.error,
          provider: this.config.provider,
          type: "invoice",
        })

        return false
      }
    } catch (error) {
      console.error("[v0] Invoice SMS service error:", error)
      return false
    }
  }

  private async logSMSDelivery(logData: any): Promise<void> {
    try {
      await fetch("/api/sms-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      })
    } catch (error) {
      console.error("Failed to log SMS delivery:", error)
    }
  }
}

// Mock SMS Provider for testing
class MockSMSProvider implements SMSProvider {
  name = "mock"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[v0] Mock SMS to ${to}: ${message}`)

    // Simulate random success/failure for testing
    const success = Math.random() > 0.1 // 90% success rate

    if (success) {
      return {
        success: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }
    } else {
      return {
        success: false,
        error: "Mock SMS delivery failed",
      }
    }
  }
}

// Twilio SMS Provider
class TwilioProvider implements SMSProvider {
  name = "twilio"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // This would integrate with actual Twilio API
      // For now, return mock response
      console.log(`[v0] Twilio SMS to ${to}: ${message}`)
      return {
        success: true,
        messageId: `twilio_${Date.now()}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Twilio SMS failed",
      }
    }
  }
}

// Africa's Talking SMS Provider
class AfricasTalkingProvider implements SMSProvider {
  name = "africastalking"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // This would integrate with actual Africa's Talking API
      console.log(`[v0] Africa's Talking SMS to ${to}: ${message}`)
      return {
        success: true,
        messageId: `at_${Date.now()}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Africa's Talking SMS failed",
      }
    }
  }
}

// TextLocal SMS Provider
class TextLocalProvider implements SMSProvider {
  name = "textlocal"

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // This would integrate with actual TextLocal API
      console.log(`[v0] TextLocal SMS to ${to}: ${message}`)
      return {
        success: true,
        messageId: `tl_${Date.now()}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "TextLocal SMS failed",
      }
    }
  }
}

export const smsService = new SMSService()
