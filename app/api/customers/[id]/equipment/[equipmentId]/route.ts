import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string; equipmentId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const equipmentId = Number.parseInt(params.equipmentId)

    // Get equipment details before deletion
    const equipment = await sql`
      SELECT * FROM customer_equipment 
      WHERE id = ${equipmentId} AND customer_id = ${customerId}
    `

    if (equipment.length === 0) {
      return NextResponse.json({ success: false, error: "Equipment assignment not found" }, { status: 404 })
    }

    await sql`
      UPDATE customer_equipment 
      SET status = 'returned', 
          returned_date = NOW(),
          notes = COALESCE(notes || ' | ', '') || 'Unassigned on ' || NOW()::text
      WHERE id = ${equipmentId} AND customer_id = ${customerId}
    `

    // Return equipment to inventory if it has an inventory_item_id
    if (equipment[0].inventory_item_id) {
      await sql`
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity + 1 
        WHERE id = ${equipment[0].inventory_item_id}
      `
    }

    return NextResponse.json({
      success: true,
      message: "Equipment unassigned successfully",
    })
  } catch (error) {
    console.error("Error unassigning equipment:", error)
    return NextResponse.json({ success: false, error: "Failed to unassign equipment" }, { status: 500 })
  }
}
