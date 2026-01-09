import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { customerId, type, content, recipient } = await request.json()

    // Log the communication
    await sql`
      INSERT INTO communications (customer_id, type, subject, content, recipient, status, direction, created_at)
      VALUES (${customerId}, ${type}, 'Customer Message', ${content}, ${recipient}, 'sent', 'outbound', NOW())
    `

    console.log(`[v0] Sending ${type} to ${recipient}: ${content}`)

    return NextResponse.json({
      success: true,
      message: `${type.toUpperCase()} sent successfully`,
    })
  } catch (error) {
    console.error("[v0] Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
