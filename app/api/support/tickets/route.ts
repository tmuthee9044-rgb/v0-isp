import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const tickets = await sql`
      SELECT 
        st.id,
        COALESCE(st.ticket_number, 'TKT-' || LPAD(st.id::text, 4, '0')) as ticket_number,
        COALESCE(st.subject, st.title) as subject,
        st.description,
        st.priority,
        st.status,
        st.created_at,
        st.updated_at,
        st.resolved_at,
        c.first_name || ' ' || c.last_name as customer_name,
        c.id as customer_id,
        e.first_name || ' ' || e.last_name as assignee_name,
        e.id as assignee_id
      FROM support_tickets st
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN employees e ON st.assigned_to = e.id
      ORDER BY st.created_at DESC
    `

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, subject, description, priority, assigned_to } = body

    let validAssignedTo = null
    if (assigned_to) {
      const [assignee] = await sql`SELECT id FROM users WHERE id = ${assigned_to}`
      if (assignee) {
        validAssignedTo = assigned_to
      } else {
        console.warn(`User ID ${assigned_to} does not exist, creating ticket without assignment`)
      }
    }

    // Generate ticket number
    const ticketCount = await sql`SELECT COUNT(*) as count FROM support_tickets`
    const ticketNumber = `TKT-${String(Number(ticketCount[0].count) + 1).padStart(4, "0")}`

    const [ticket] = await sql`
      INSERT INTO support_tickets (
        ticket_number, customer_id, title, subject, description, priority, status, assigned_to, created_at, updated_at
      ) VALUES (
        ${ticketNumber}, ${customer_id}, ${subject}, ${subject}, ${description}, ${priority}, 'open', ${validAssignedTo}, NOW(), NOW()
      ) RETURNING *
    `

    if (validAssignedTo) {
      const [employee] = await sql`SELECT phone FROM employees WHERE id = ${validAssignedTo}`
      if (employee?.phone) {
        // Trigger SMS alert (implementation would depend on SMS service)
        console.log(`SMS Alert: New ticket ${ticketNumber} assigned to employee ${validAssignedTo}`)
      }
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}
