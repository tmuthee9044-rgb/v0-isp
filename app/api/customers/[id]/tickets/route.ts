import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const tickets = await sql`
      SELECT 
        st.*,
        u.username as assigned_to_name
      FROM support_tickets st
      LEFT JOIN users u ON st.assigned_to = u.id
      WHERE st.customer_id = ${customerId}
      ORDER BY st.created_at DESC
    `

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("Error fetching customer tickets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { title, subject, description, priority } = await request.json()

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}`

    const [ticket] = await sql`
      INSERT INTO support_tickets (
        customer_id,
        ticket_number,
        title,
        subject,
        description,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${customerId},
        ${ticketNumber},
        ${title},
        ${subject},
        ${description},
        ${priority},
        'open',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 })
  }
}
