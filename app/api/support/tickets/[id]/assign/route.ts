import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, assigned_to } = body

    const [ticket] = await sql`
      UPDATE support_tickets 
      SET status = ${status || "in_progress"}, 
          assigned_to = ${assigned_to || assigned_to}, 
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
