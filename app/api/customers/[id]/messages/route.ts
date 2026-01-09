import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const messages = await sql`
      SELECT 
        m.*,
        COALESCE(u.username, 'System') as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.recipient_id = ${customerId} 
        AND m.recipient_type = 'customer'
      ORDER BY m.created_at DESC
    `

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error("Error fetching customer messages:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { type, subject, content, template_id } = await request.json()

    // Create message record
    const [message] = await sql`
      INSERT INTO messages (
        recipient_id,
        recipient_type,
        sender_id,
        message_type,
        subject,
        content,
        template_id,
        status,
        created_at
      ) VALUES (
        ${customerId},
        'customer',
        1, -- Default admin user, should be from session
        ${type},
        ${subject || null},
        ${content},
        ${template_id || null},
        'sent',
        NOW()
      )
      RETURNING *
    `

    // Update sent_at timestamp
    await sql`
      UPDATE messages 
      SET sent_at = NOW(), status = 'delivered'
      WHERE id = ${message.id}
    `

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 })
  }
}
