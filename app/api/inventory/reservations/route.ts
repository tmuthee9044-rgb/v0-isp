import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get stock reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const reservationType = searchParams.get("type")
    const warehouseId = searchParams.get("warehouse_id")

    let query = `
      SELECT 
        sr.*,
        ii.name as item_name,
        ii.sku,
        w.name as warehouse_name,
        u.username as reserved_by_name,
        c.first_name,
        c.last_name
      FROM stock_reservations sr
      JOIN inventory_items ii ON sr.inventory_item_id = ii.id
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      LEFT JOIN users u ON sr.reserved_by = u.id
      LEFT JOIN customers c ON sr.reference_id = c.id AND sr.reservation_type = 'customer_order'
      WHERE 1=1
    `

    const params = []
    let paramIndex = 1

    if (status !== "all") {
      query += ` AND sr.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (reservationType) {
      query += ` AND sr.reservation_type = $${paramIndex}`
      params.push(reservationType)
      paramIndex++
    }

    if (warehouseId) {
      query += ` AND sr.warehouse_id = $${paramIndex}`
      params.push(warehouseId)
      paramIndex++
    }

    query += ` ORDER BY sr.created_at DESC`

    const result = await sql.query(query, params)

    const reservations = result.rows.map((res: any) => ({
      id: res.id,
      inventory_item_id: res.inventory_item_id,
      item_name: res.item_name,
      sku: res.sku,
      warehouse_id: res.warehouse_id,
      warehouse_name: res.warehouse_name,
      reserved_quantity: Number(res.reserved_quantity),
      reservation_type: res.reservation_type,
      reference_id: res.reference_id,
      customer_name: res.first_name && res.last_name ? `${res.first_name} ${res.last_name}` : null,
      reserved_by: res.reserved_by,
      reserved_by_name: res.reserved_by_name,
      reserved_until: res.reserved_until,
      status: res.status,
      notes: res.notes,
      created_at: res.created_at,
      updated_at: res.updated_at,
    }))

    return NextResponse.json({
      success: true,
      reservations,
      summary: {
        total_reservations: reservations.length,
        active_reservations: reservations.filter((r) => r.status === "active").length,
        total_reserved_quantity: reservations
          .filter((r) => r.status === "active")
          .reduce((sum, r) => sum + r.reserved_quantity, 0),
      },
    })
  } catch (error) {
    console.error("Error fetching stock reservations:", error)
    return NextResponse.json({ error: "Failed to fetch stock reservations" }, { status: 500 })
  }
}

// Create stock reservation
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const result = await sql.begin(async (sql) => {
      // Check available stock
      const availableStock = await sql`
        SELECT 
          il.quantity,
          COALESCE(SUM(sr.reserved_quantity), 0) as total_reserved
        FROM inventory_locations il
        LEFT JOIN stock_reservations sr ON il.inventory_item_id = sr.inventory_item_id 
          AND il.warehouse_id = sr.warehouse_id AND sr.status = 'active'
        WHERE il.inventory_item_id = ${data.inventory_item_id} 
        AND il.warehouse_id = ${data.warehouse_id}
        GROUP BY il.quantity
      `

      if (availableStock.length === 0) {
        throw new Error("Item not found in specified warehouse")
      }

      const available = Number(availableStock[0].quantity) - Number(availableStock[0].total_reserved)

      if (available < data.reserved_quantity) {
        throw new Error(`Insufficient stock. Available: ${available}, Requested: ${data.reserved_quantity}`)
      }

      // Create reservation
      const reservation = await sql`
        INSERT INTO stock_reservations (
          inventory_item_id, warehouse_id, reserved_quantity, reservation_type,
          reference_id, reserved_by, reserved_until, status, notes
        ) VALUES (
          ${data.inventory_item_id}, ${data.warehouse_id}, ${data.reserved_quantity},
          ${data.reservation_type}, ${data.reference_id || null}, ${data.reserved_by || 1},
          ${data.reserved_until || null}, ${data.status || "active"}, ${data.notes || null}
        )
        RETURNING *
      `

      // Update inventory location reserved quantity
      await sql`
        UPDATE inventory_locations 
        SET reserved_quantity = reserved_quantity + ${data.reserved_quantity}
        WHERE inventory_item_id = ${data.inventory_item_id} 
        AND warehouse_id = ${data.warehouse_id}
      `

      return reservation[0]
    })

    return NextResponse.json({
      success: true,
      message: "Stock reservation created successfully",
      reservation: result,
    })
  } catch (error) {
    console.error("Error creating stock reservation:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create stock reservation",
      },
      { status: 500 },
    )
  }
}

// Update reservation status (fulfill, cancel, etc.)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { reservation_id, status, notes } = data

    const result = await sql.begin(async (sql) => {
      // Get current reservation
      const currentReservation = await sql`
        SELECT * FROM stock_reservations WHERE id = ${reservation_id}
      `

      if (currentReservation.length === 0) {
        throw new Error("Reservation not found")
      }

      const reservation = currentReservation[0]

      // Update reservation status
      await sql`
        UPDATE stock_reservations 
        SET status = ${status}, notes = ${notes || reservation.notes}, updated_at = NOW()
        WHERE id = ${reservation_id}
      `

      // If cancelled or fulfilled, update inventory location reserved quantity
      if (status === "cancelled" || status === "fulfilled") {
        await sql`
          UPDATE inventory_locations 
          SET reserved_quantity = reserved_quantity - ${reservation.reserved_quantity}
          WHERE inventory_item_id = ${reservation.inventory_item_id} 
          AND warehouse_id = ${reservation.warehouse_id}
        `

        // If fulfilled, record movement
        if (status === "fulfilled") {
          await sql`
            INSERT INTO inventory_movements (
              inventory_item_id, movement_type, quantity, reference_type, reference_id,
              from_location, reason, performed_by
            ) VALUES (
              ${reservation.inventory_item_id}, 'out', ${reservation.reserved_quantity},
              'reservation_fulfillment', ${reservation_id}, ${reservation.warehouse_id},
              'Stock reservation fulfilled', ${data.performed_by || 1}
            )
          `

          // Update actual inventory quantity
          await sql`
            UPDATE inventory_locations 
            SET quantity = quantity - ${reservation.reserved_quantity}
            WHERE inventory_item_id = ${reservation.inventory_item_id} 
            AND warehouse_id = ${reservation.warehouse_id}
          `
        }
      }

      return { reservation_id, old_status: reservation.status, new_status: status }
    })

    return NextResponse.json({
      success: true,
      message: "Reservation updated successfully",
      result,
    })
  } catch (error) {
    console.error("Error updating stock reservation:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to update stock reservation",
      },
      { status: 500 },
    )
  }
}
