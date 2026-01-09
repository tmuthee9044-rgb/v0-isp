import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const id = Number(params.id)

    await sql`
      UPDATE inventory_items 
      SET 
        name = ${data.name},
        sku = ${data.sku},
        category = ${data.category},
        stock_quantity = ${data.stock_quantity},
        unit_cost = ${data.unit_cost},
        description = ${data.description},
        status = ${data.status || "active"},
        updated_at = NOW()
      WHERE id = ${id}
    `

    if (data.warehouse_id) {
      try {
        // Check if location record exists
        const existingLocation = await sql`
          SELECT id FROM inventory_locations 
          WHERE inventory_item_id = ${id} AND warehouse_id = ${data.warehouse_id}
        `

        if (existingLocation.length > 0) {
          // Update existing location
          await sql`
            UPDATE inventory_locations 
            SET 
              quantity = ${data.stock_quantity},
              updated_at = NOW()
            WHERE inventory_item_id = ${id} AND warehouse_id = ${data.warehouse_id}
          `
        } else {
          // Create new location record
          await sql`
            INSERT INTO inventory_locations (
              inventory_item_id, warehouse_id, quantity, reserved_quantity,
              min_stock_level, max_stock_level, location_code
            ) VALUES (
              ${id}, ${data.warehouse_id}, ${data.stock_quantity}, 0,
              5, 100, 'A1-01'
            )
          `
        }
      } catch (error) {
        console.log("[v0] Inventory locations table not found, skipping location update")
      }
    }

    return NextResponse.json({
      success: true,
      message: "Inventory item updated successfully",
    })
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    await sql`
      DELETE FROM inventory_items 
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting inventory item:", error)
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 })
  }
}
