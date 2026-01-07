import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()

  try {
    const { id } = params
    const body = await request.json()
    const { status, assigned_to } = body

    const sanitizedAssignedTo = assigned_to !== undefined && assigned_to !== null ? assigned_to : null

    const [ticket] = await sql`
      UPDATE support_tickets 
      SET status = ${status || "in_progress"}, 
          assigned_to = ${sanitizedAssignedTo}, 
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
