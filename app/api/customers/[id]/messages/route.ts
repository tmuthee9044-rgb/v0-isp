import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()
  try {
    const customerId = Number.parseInt(params.id)

    const messages = await sql`
      SELECT 
        m.*,
        COALESCE(
          NULLIF(CONCAT(c.first_name, ' ', c.last_name), ' '),
          c.name
        ) as recipient_name
      FROM messages m
      LEFT JOIN customers c ON m.customer_id = c.id
      WHERE m.customer_id = ${customerId}
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
  const sql = await getSql()
  try {
    const customerId = Number.parseInt(params.id)
    const { messageType, subject, content, template_id } = await request.json()

    const [customer] = await sql`
      SELECT 
        email, 
        phone, 
        COALESCE(
          NULLIF(CONCAT(first_name, ' ', last_name), ' '),
          name
        ) as full_name
      FROM customers 
      WHERE id = ${customerId}
      LIMIT 1
    `

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const recipient = messageType === "email" ? customer.email : customer.phone

    if (!recipient) {
      return NextResponse.json({ success: false, error: `Customer has no ${messageType} on file` }, { status: 400 })
    }

    const [message] = await sql`
      INSERT INTO messages (
        type,
        recipient,
        subject,
        content,
        template_id,
        customer_id,
        status,
        created_at
      ) VALUES (
        ${messageType || "sms"},
        ${recipient},
        ${subject || null},
        ${content},
        ${template_id || null},
        ${customerId},
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
