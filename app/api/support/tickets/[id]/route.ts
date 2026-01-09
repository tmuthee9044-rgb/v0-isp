import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [ticket] = await sql`
      SELECT 
        st.*,
        c.first_name || ' ' || c.last_name as customer_name,
        e.first_name || ' ' || e.last_name as assignee_name,
        e.phone as assignee_phone
      FROM support_tickets st
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN employees e ON st.assigned_to = e.id
      WHERE st.id = ${params.id}
    `

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status, assigned_to, priority, resolution_notes, time_spent, items_used } = body

    // Update ticket
    const [ticket] = await sql`
      UPDATE support_tickets 
      SET 
        status = COALESCE(${status}, status),
        assigned_to = COALESCE(${assigned_to}, assigned_to),
        priority = COALESCE(${priority}, priority),
        resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Record performance tracking if provided
    if (assigned_to && (time_spent || items_used || resolution_notes)) {
      await sql`
        INSERT INTO employee_performance_tracking (
          ticket_id, employee_id, action_type, time_spent, items_used, 
          resolution_notes, created_at
        ) VALUES (
          ${params.id}, ${assigned_to}, ${status || "updated"}, 
          ${time_spent}, ${items_used}, ${resolution_notes}, NOW()
        )
      `
    }

    // Send SMS alert if ticket is being assigned to a new employee
    if (assigned_to) {
      const [employee] = await sql`SELECT phone FROM employees WHERE id = ${assigned_to}`
      if (employee?.phone) {
        // Log SMS alert (actual SMS implementation would depend on SMS service)
        console.log(`[v0] SMS Alert: Ticket ${params.id} assigned to employee ${assigned_to} (${employee.phone})`)

        // You would integrate with an SMS service here, for example:
        // await sendSMS(employee.phone, `New ticket ${ticket.ticket_number} assigned to you. Priority: ${ticket.priority}`)
      }
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
