import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string; ticketId: string } }) {
  try {
    const ticketId = Number.parseInt(params.ticketId)
    const { status, assigned_to, priority } = await request.json()

    const updateData: any = { updated_at: new Date() }

    if (status) updateData.status = status
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (priority) updateData.priority = priority

    // Set resolved_at if status is resolved
    if (status === "resolved") {
      updateData.resolved_at = new Date()
    }

    const [ticket] = await sql`
      UPDATE support_tickets 
      SET 
        status = COALESCE(${status}, status),
        assigned_to = COALESCE(${assigned_to}, assigned_to),
        priority = COALESCE(${priority}, priority),
        resolved_at = ${status === "resolved" ? sql`NOW()` : sql`resolved_at`},
        updated_at = NOW()
      WHERE id = ${ticketId}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
