import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const workflowId = params.id

    console.log("[v0] Toggling workflow status:", workflowId)

    // Get current status
    const current = await sql`
      SELECT is_active FROM automation_workflows WHERE id = ${workflowId}
    `

    if (current.length === 0) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 })
    }

    // Toggle status
    const newStatus = !current[0].is_active

    const result = await sql`
      UPDATE automation_workflows
      SET is_active = ${newStatus}, updated_at = NOW()
      WHERE id = ${workflowId}
      RETURNING *
    `

    console.log("[v0] Workflow status toggled to:", newStatus)

    return NextResponse.json({
      success: true,
      workflow: result[0],
    })
  } catch (error) {
    console.error("[v0] Error toggling workflow:", error)
    return NextResponse.json({ success: false, error: "Failed to toggle workflow" }, { status: 500 })
  }
}
