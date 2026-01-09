import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { purchase_order_id, items, user_id } = await request.json()

    if (!purchase_order_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Purchase order ID and items array are required" },
        { status: 400 },
      )
    }

    // Start transaction-like operations
    const results = []

    for (const item of items) {
      const { inventory_item_id, quantity_received } = item

      if (!inventory_item_id || !quantity_received || quantity_received <= 0) {
        continue
      }

      try {
        const [updatedItem] = await sql`
          UPDATE inventory_items 
          SET 
            stock_quantity = COALESCE(stock_quantity, 0) + ${quantity_received},
            updated_at = NOW()
          WHERE id = ${inventory_item_id}
          RETURNING *
        `

        if (updatedItem) {
          await sql`
            INSERT INTO inventory_movements (
              inventory_item_id, 
              movement_type, 
              quantity, 
              unit_price, 
              total_value,
              reference_type, 
              reference_id,
              to_location, 
              reason, 
              performed_by,
              created_at
            ) VALUES (
              ${inventory_item_id}, 
              'in', 
              ${quantity_received}, 
              ${item.unit_price || 0},
              ${quantity_received * (item.unit_price || 0)},
              'purchase_order', 
              ${purchase_order_id},
              'MAIN', 
              'Stock received from purchase order', 
              ${user_id || 1},
              NOW()
            )
          `

          results.push({
            inventory_item_id,
            quantity_received,
            new_stock_quantity: updatedItem.stock_quantity,
            success: true,
          })
        }
      } catch (error) {
        console.error(`Error updating inventory item ${inventory_item_id}:`, error)
        results.push({
          inventory_item_id,
          quantity_received,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Inventory updated successfully",
      results,
    })
  } catch (error) {
    console.error("Error updating inventory stock:", error)
    return NextResponse.json({ success: false, error: "Failed to update inventory stock" }, { status: 500 })
  }
}
