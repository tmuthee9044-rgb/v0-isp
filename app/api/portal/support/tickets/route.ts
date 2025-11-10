import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const subject = formData.get("subject") as string
    const description = formData.get("description") as string
    const priority = (formData.get("priority") as string) || "medium"

    if (!customerId || !subject || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const [ticket] = await sql`
      INSERT INTO support_tickets (
        customer_id,
        title,
        description,
        priority,
        status,
        created_at
      ) VALUES (
        ${customerId},
        ${subject},
        ${description},
        ${priority},
        'open',
        NOW()
      ) RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Support ticket created successfully",
      ticket_id: ticket.id,
    })
  } catch (error) {
    console.error("Support ticket creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create support ticket" }, { status: 500 })
  }
}
