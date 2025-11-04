import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Bulk inventory operations
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { operation_type, items, performed_by = 1 } = data

    const result = await sql.begin(async (sql) => {
      const results = []
      const errors = []

      switch (operation_type) {
        case "bulk_adjustment":
          for (const item of items) {
            try {
              // Get current stock
              const currentStock = await sql`
                SELECT quantity FROM inventory_locations 
                WHERE inventory_item_id = ${item.inventory_item_id} 
                AND warehouse_id = ${item.warehouse_id}
              `

              if (currentStock.length === 0) {
                errors.push(`Item ${item.inventory_item_id} not found in warehouse ${item.warehouse_id}`)
                continue
              }

              const quantityBefore = Number(currentStock[0].quantity)
              const adjustmentQty = Number(item.adjustment_quantity)
              const quantityAfter =
                item.adjustment_type === "increase" ? quantityBefore + adjustmentQty : quantityBefore - adjustmentQty

              if (quantityAfter < 0) {
                errors.push(`Item ${item.inventory_item_id}: Adjustment would result in negative stock`)
                continue
              }

              // Create adjustment
              const adjustmentNumber = `BULK${Date.now().toString().slice(-6)}${item.inventory_item_id}`

              const adjustment = await sql`
                INSERT INTO stock_adjustments (
                  adjustment_number, inventory_item_id, warehouse_id, adjustment_type,
                  quantity_before, quantity_after, adjustment_quantity, unit_cost,
                  total_value, reason, description, performed_by
                ) VALUES (
                  ${adjustmentNumber}, ${item.inventory_item_id}, ${item.warehouse_id},
                  ${item.adjustment_type}, ${quantityBefore}, ${quantityAfter}, ${adjustmentQty},
                  ${item.unit_cost}, ${adjustmentQty * item.unit_cost}, ${item.reason},
                  'Bulk adjustment operation', ${performed_by}
                )
                RETURNING id
              `

              // Update inventory
              await sql`
                UPDATE inventory_locations 
                SET quantity = ${quantityAfter}
                WHERE inventory_item_id = ${item.inventory_item_id} 
                AND warehouse_id = ${item.warehouse_id}
              `

              // Record movement
              await sql`
                INSERT INTO inventory_movements (
                  inventory_item_id, movement_type, quantity, unit_price, total_value,
                  reference_type, reference_id, reason, performed_by
                ) VALUES (
                  ${item.inventory_item_id}, ${item.adjustment_type === "increase" ? "in" : "out"},
                  ${adjustmentQty}, ${item.unit_cost}, ${adjustmentQty * item.unit_cost},
                  'bulk_adjustment', ${adjustment[0].id}, 'Bulk adjustment', ${performed_by}
                )
              `

              results.push({
                inventory_item_id: item.inventory_item_id,
                adjustment_id: adjustment[0].id,
                quantity_before: quantityBefore,
                quantity_after: quantityAfter,
                status: "success",
              })
            } catch (error) {
              errors.push(`Item ${item.inventory_item_id}: ${error.message}`)
            }
          }
          break

        case "bulk_transfer":
          const transferNumber = `BULK${Date.now().toString().slice(-6)}`

          // Create transfer record
          const transfer = await sql`
            INSERT INTO warehouse_transfers (
              transfer_number, from_warehouse_id, to_warehouse_id, transfer_date,
              status, total_items, initiated_by, notes
            ) VALUES (
              ${transferNumber}, ${data.from_warehouse_id}, ${data.to_warehouse_id},
              ${data.transfer_date || new Date().toISOString().split("T")[0]},
              'pending', ${items.length}, ${performed_by}, 'Bulk transfer operation'
            )
            RETURNING id
          `

          const transferId = transfer[0].id

          for (const item of items) {
            try {
              // Check available stock
              const availableStock = await sql`
                SELECT 
                  il.quantity,
                  COALESCE(SUM(sr.reserved_quantity), 0) as total_reserved
                FROM inventory_locations il
                LEFT JOIN stock_reservations sr ON il.inventory_item_id = sr.inventory_item_id 
                  AND il.warehouse_id = sr.warehouse_id AND sr.status = 'active'
                WHERE il.inventory_item_id = ${item.inventory_item_id} 
                AND il.warehouse_id = ${data.from_warehouse_id}
                GROUP BY il.quantity
              `

              if (availableStock.length === 0) {
                errors.push(`Item ${item.inventory_item_id} not found in source warehouse`)
                continue
              }

              const available = Number(availableStock[0].quantity) - Number(availableStock[0].total_reserved)

              if (available < item.quantity) {
                errors.push(`Item ${item.inventory_item_id}: Insufficient stock. Available: ${available}`)
                continue
              }

              // Add transfer item
              await sql`
                INSERT INTO warehouse_transfer_items (
                  transfer_id, inventory_item_id, quantity_requested,
                  unit_cost, total_cost
                ) VALUES (
                  ${transferId}, ${item.inventory_item_id}, ${item.quantity},
                  ${item.unit_cost}, ${item.quantity * item.unit_cost}
                )
              `

              // Reserve stock
              await sql`
                INSERT INTO stock_reservations (
                  inventory_item_id, warehouse_id, reserved_quantity,
                  reservation_type, reference_id, reserved_by, status
                ) VALUES (
                  ${item.inventory_item_id}, ${data.from_warehouse_id}, ${item.quantity},
                  'transfer', ${transferId}, ${performed_by}, 'active'
                )
              `

              results.push({
                inventory_item_id: item.inventory_item_id,
                transfer_id: transferId,
                quantity: item.quantity,
                status: "success",
              })
            } catch (error) {
              errors.push(`Item ${item.inventory_item_id}: ${error.message}`)
            }
          }
          break

        case "bulk_reservation":
          for (const item of items) {
            try {
              // Check available stock
              const availableStock = await sql`
                SELECT 
                  il.quantity,
                  COALESCE(SUM(sr.reserved_quantity), 0) as total_reserved
                FROM inventory_locations il
                LEFT JOIN stock_reservations sr ON il.inventory_item_id = sr.inventory_item_id 
                  AND il.warehouse_id = sr.warehouse_id AND sr.status = 'active'
                WHERE il.inventory_item_id = ${item.inventory_item_id} 
                AND il.warehouse_id = ${item.warehouse_id}
                GROUP BY il.quantity
              `

              if (availableStock.length === 0) {
                errors.push(`Item ${item.inventory_item_id} not found in warehouse`)
                continue
              }

              const available = Number(availableStock[0].quantity) - Number(availableStock[0].total_reserved)

              if (available < item.reserved_quantity) {
                errors.push(`Item ${item.inventory_item_id}: Insufficient stock. Available: ${available}`)
                continue
              }

              // Create reservation
              const reservation = await sql`
                INSERT INTO stock_reservations (
                  inventory_item_id, warehouse_id, reserved_quantity, reservation_type,
                  reference_id, reserved_by, reserved_until, status, notes
                ) VALUES (
                  ${item.inventory_item_id}, ${item.warehouse_id}, ${item.reserved_quantity},
                  ${item.reservation_type}, ${item.reference_id || null}, ${performed_by},
                  ${item.reserved_until || null}, 'active', 'Bulk reservation'
                )
                RETURNING id
              `

              // Update reserved quantity
              await sql`
                UPDATE inventory_locations 
                SET reserved_quantity = reserved_quantity + ${item.reserved_quantity}
                WHERE inventory_item_id = ${item.inventory_item_id} 
                AND warehouse_id = ${item.warehouse_id}
              `

              results.push({
                inventory_item_id: item.inventory_item_id,
                reservation_id: reservation[0].id,
                reserved_quantity: item.reserved_quantity,
                status: "success",
              })
            } catch (error) {
              errors.push(`Item ${item.inventory_item_id}: ${error.message}`)
            }
          }
          break

        default:
          throw new Error(`Unsupported operation type: ${operation_type}`)
      }

      return { results, errors, operation_type }
    })

    return NextResponse.json({
      success: true,
      message: "Bulk operation completed",
      data: result,
      summary: {
        total_items: items.length,
        successful: result.results.length,
        failed: result.errors.length,
      },
    })
  } catch (error) {
    console.error("Error performing bulk operation:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to perform bulk operation",
      },
      { status: 500 },
    )
  }
}
