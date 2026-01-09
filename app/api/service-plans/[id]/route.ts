import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("[v0] DELETE /api/service-plans/[id] called with ID:", params.id)

  try {
    const sql = await getSql()
    const planId = Number.parseInt(params.id)

    if (isNaN(planId)) {
      return NextResponse.json({ success: false, error: "Invalid plan ID" }, { status: 400 })
    }

    // Check if plan exists
    const existingPlan = await sql`
      SELECT id, name FROM service_plans WHERE id = ${planId}
    `

    if (existingPlan.length === 0) {
      return NextResponse.json({ success: false, error: "Service plan not found" }, { status: 404 })
    }

    // Check if plan has active customers
    const activeCustomers = await sql`
      SELECT COUNT(*) as count FROM customer_services 
      WHERE service_plan_id = ${planId} AND status = 'active'
    `

    if (Number.parseInt(activeCustomers[0].count) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete plan "${existingPlan[0].name}". It has ${activeCustomers[0].count} active customers. Please deactivate or migrate customers first.`,
        },
        { status: 400 },
      )
    }

    // Delete the plan
    await sql`
      DELETE FROM service_plans WHERE id = ${planId}
    `

    console.log("[v0] Successfully deleted service plan:", planId)

    return NextResponse.json({
      success: true,
      message: `Service plan "${existingPlan[0].name}" has been deleted successfully.`,
    })
  } catch (error: any) {
    console.error("[v0] Error deleting service plan:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete service plan" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const planId = Number.parseInt(params.id)
    const formData = await request.formData()

    if (isNaN(planId)) {
      return NextResponse.json({ success: false, error: "Invalid plan ID" }, { status: 400 })
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const speed = formData.get("speed") as string
    const category = formData.get("category") as string
    const fup_limit = formData.get("fup_limit") ? Number.parseInt(formData.get("fup_limit") as string) : null
    const fup_speed = formData.get("fup_speed") as string | null

    // Update the plan
    await sql`
      UPDATE service_plans SET
        name = ${name},
        description = ${description},
        price = ${price},
        speed = ${speed},
        category = ${category},
        fup_limit = ${fup_limit},
        fup_speed = ${fup_speed},
        updated_at = NOW()
      WHERE id = ${planId}
    `

    return NextResponse.json({
      success: true,
      message: "Service plan updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating service plan:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update service plan" },
      { status: 500 },
    )
  }
}
