import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, description, trigger_type, trigger_conditions, actions, is_active } = body
    const workflowId = params.id

    console.log("[v0] Updating workflow:", workflowId)

    const result = await sql`
      UPDATE automation_workflows
      SET
        name = ${name},
        description = ${description},
        trigger_type = ${trigger_type},
        trigger_conditions = ${JSON.stringify(trigger_conditions || {})},
        actions = ${JSON.stringify(actions || [])},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE id = ${workflowId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 })
    }

    console.log("[v0] Workflow updated successfully")

    return NextResponse.json({
      success: true,
      workflow: result[0],
    })
  } catch (error) {
    console.error("[v0] Error updating workflow:", error)
    return NextResponse.json({ success: false, error: "Failed to update workflow" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const workflowId = params.id

    console.log("[v0] Deleting workflow:", workflowId)

    const result = await sql`
      DELETE FROM automation_workflows
      WHERE id = ${workflowId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 })
    }

    console.log("[v0] Workflow deleted successfully")

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting workflow:", error)
    return NextResponse.json({ success: false, error: "Failed to delete workflow" }, { status: 500 })
  }
}
