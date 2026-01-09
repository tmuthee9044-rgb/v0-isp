import { getSql } from "@/lib/db"

/**
 * Automated Dunning & Reminders
 * Per design: T-5 days, T-2 days, Expiry, T+3 final notice
 */
export class DunningEngine {
  /**
   * Send dunning notifications
   * Should run every 4 hours via cron
   */
  static async sendDunningNotifications(): Promise<{ sent: number }> {
    const sql = await getSql()

    // Get pending notifications that are due
    const notifications = await sql`
      SELECT sn.*, cs.customer_id, c.first_name, c.phone, c.email
      FROM service_notifications sn
      JOIN customer_services cs ON sn.service_id = cs.id
      JOIN customers c ON cs.customer_id = c.id::uuid
      WHERE sn.status = 'pending'
      AND sn.scheduled_for <= NOW()
      ORDER BY sn.scheduled_for
      LIMIT 100
    `

    let sent = 0

    for (const notif of notifications) {
      try {
        // Send SMS (integrate with SMS gateway)
        await this.sendSMS(notif.phone, notif.message)

        // Send Email (integrate with email service)
        await this.sendEmail(notif.email, "Service Expiry Notice", notif.message)

        // Mark as sent
        await sql`
          UPDATE service_notifications
          SET status = 'sent', sent_at = NOW()
          WHERE id = ${notif.id}::uuid
        `

        // Log to notifications table
        await sql`
          INSERT INTO notifications (customer_id, service_id, channel, message, status, sent_at)
          VALUES (${notif.customer_id}::uuid, ${notif.service_id}::uuid, 'sms', ${notif.message}, 'sent', NOW())
        `

        sent++
      } catch (error) {
        // Mark as failed
        await sql`
          UPDATE service_notifications
          SET status = 'failed'
          WHERE id = ${notif.id}::uuid
        `
      }
    }

    return { sent }
  }

  private static async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Integrate with Africa's Talking or similar
    console.log(`[SMS] To: ${phone}, Message: ${message}`)
  }

  private static async sendEmail(email: string, subject: string, body: string): Promise<void> {
    // TODO: Integrate with SendGrid or similar
    console.log(`[Email] To: ${email}, Subject: ${subject}`)
  }

  /**
   * Generate dunning message template
   */
  static formatMessage(template: string, variables: Record<string, any>): string {
    let message = template
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), String(value))
    }
    return message
  }
}
