import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const log = await sql`
      SELECT * FROM system_logs 
      WHERE id = ${id}
    `

    if (log.length === 0) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 })
    }

    return NextResponse.json(log[0])
  } catch (error) {
    console.error("Error fetching log entry:", error)
    return NextResponse.json({ error: "Failed to fetch log entry" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const result = await sql`
      DELETE FROM system_logs 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Log entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting log entry:", error)
    return NextResponse.json({ error: "Failed to delete log entry" }, { status: 500 })
  }
}
