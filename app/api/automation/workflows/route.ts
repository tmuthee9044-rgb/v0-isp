import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching automation workflows...")

    const workflows = await sql`
      SELECT 
        id,
        name,
        description,
        trigger_type,
        trigger_conditions,
        actions,
        is_active,
        created_at,
        updated_at
      FROM automation_workflows
      ORDER BY created_at DESC
    `

    console.log("[v0] Found workflows:", workflows.length)

    return NextResponse.json({
      success: true,
      workflows: workflows.map((w) => ({
        ...w,
        trigger_conditions:
          typeof w.trigger_conditions === "string" ? JSON.parse(w.trigger_conditions) : w.trigger_conditions,
        actions: typeof w.actions === "string" ? JSON.parse(w.actions) : w.actions,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching workflows:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch workflows" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, trigger_type, trigger_conditions, actions } = body

    console.log("[v0] Creating workflow:", name)

    const result = await sql`
      INSERT INTO automation_workflows (
        name,
        description,
        trigger_type,
        trigger_conditions,
        actions,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${description},
        ${trigger_type},
        ${JSON.stringify(trigger_conditions || {})},
        ${JSON.stringify(actions || [])},
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Workflow created successfully")

    return NextResponse.json({
      success: true,
      workflow: result[0],
    })
  } catch (error) {
    console.error("[v0] Error creating workflow:", error)
    return NextResponse.json({ success: false, error: "Failed to create workflow" }, { status: 500 })
  }
}
