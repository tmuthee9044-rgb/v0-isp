/**
 * API endpoint for sending emails and SMS
 * Used by other parts of the system to send customer communications
 */
import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email-service"
import { smsService } from "@/lib/sms-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipient, message, subject, html } = body

    if (!type || !recipient || !message) {
      return NextResponse.json({ error: "Missing required fields: type, recipient, message" }, { status: 400 })
    }

    if (type === "email") {
      const result = await emailService.sendEmail({
        to: recipient,
        subject: subject || "Message from Trust Waves ISP",
        html: html || message,
        text: message,
      })

      return NextResponse.json(result)
    }

    if (type === "sms") {
      const result = await smsService.sendSMS(recipient, message)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Invalid message type" }, { status: 400 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      { error: "Failed to send message", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
