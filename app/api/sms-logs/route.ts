import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const logs = await sql`
      SELECT 
        id,
        recipient,
        message,
        status,
        message_id,
        provider,
        error,
        created_at
      FROM sms_logs
      ORDER BY created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching SMS logs:", error)
    return NextResponse.json({ error: "Failed to fetch SMS logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { recipient, message, status, messageId, provider, error } = await request.json()

    const [log] = await sql`
      INSERT INTO sms_logs (
        recipient, message, status, message_id, provider, error, created_at
      ) VALUES (
        ${recipient}, ${message}, ${status}, ${messageId}, ${provider}, ${error}, NOW()
      ) RETURNING *
    `

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error("Error creating SMS log:", error)
    return NextResponse.json({ error: "Failed to create SMS log" }, { status: 500 })
  }
}
