import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get warehouse transfers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const warehouseId = searchParams.get("warehouse_id")

    let query = `
      SELECT 
        wt.*,
        wf.name as from_warehouse_name,
        wt_to.name as to_warehouse_name,
        COUNT(wti.id) as total_items,
        COALESCE(SUM(wti.quantity_requested), 0) as total_quantity_requested,
        COALESCE(SUM(wti.quantity_sent), 0) as total_quantity_sent,
        COALESCE(SUM(wti.quantity_received), 0) as total_quantity_received
      FROM warehouse_transfers wt
      LEFT JOIN warehouses wf ON wt.from_warehouse_id = wf.id
      LEFT JOIN warehouses wt_to ON wt.to_warehouse_id = wt_to.id
      LEFT JOIN warehouse_transfer_items wti ON wt.id = wti.transfer_id
      WHERE 1=1
    `

    const params = []
    let paramIndex = 1

    if (status !== "all") {
      query += ` AND wt.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (warehouseId) {
      query += ` AND (wt.from_warehouse_id = $${paramIndex} OR wt.to_warehouse_id = $${paramIndex})`
      params.push(warehouseId)
      paramIndex++
    }

    query += `
      GROUP BY wt.id, wf.name, wt_to.name
      ORDER BY wt.transfer_date DESC
    `

    const result = await sql.query(query, params)

    const transfers = result.rows.map((transfer: any) => ({
      id: transfer.id,
      transfer_number: transfer.transfer_number,
      from_warehouse_id: transfer.from_warehouse_id,
      to_warehouse_id: transfer.to_warehouse_id,
      from_warehouse_name: transfer.from_warehouse_name,
      to_warehouse_name: transfer.to_warehouse_name,
      transfer_date: transfer.transfer_date,
      expected_arrival_date: transfer.expected_arrival_date,
      actual_arrival_date: transfer.actual_arrival_date,
      status: transfer.status,
      total_items: Number(transfer.total_items),
      total_quantity_requested: Number(transfer.total_quantity_requested),
      total_quantity_sent: Number(transfer.total_quantity_sent),
      total_quantity_received: Number(transfer.total_quantity_received),
      total_value: Number(transfer.total_value),
      initiated_by: transfer.initiated_by,
      received_by: transfer.received_by,
      notes: transfer.notes,
      created_at: transfer.created_at,
      updated_at: transfer.updated_at,
    }))

    return NextResponse.json({
      success: true,
      transfers,
    })
  } catch (error) {
    console.error("Error fetching warehouse transfers:", error)
    return NextResponse.json({ error: "Failed to fetch warehouse transfers" }, { status: 500 })
  }
}

// Create warehouse transfer
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting warehouse transfer creation")

    const formData = await request.formData()

    // Extract form data
    const data = {
      from_warehouse_id: formData.get("from_warehouse") as string,
      to_warehouse_id: formData.get("to_warehouse") as string,
      transfer_date: new Date().toISOString().split("T")[0],
      notes: formData.get("reason") as string,
      initiated_by: 1, // Default user ID
      items: [
        {
          inventory_item_id: Number.parseInt(formData.get("item_id") as string),
          quantity_requested: Number.parseInt(formData.get("quantity") as string),
          unit_cost: 0, // Default cost
          total_cost: 0,
        },
      ],
    }

    console.log("[v0] Parsed form data:", data)

    if (
      !data.from_warehouse_id ||
      !data.to_warehouse_id ||
      !data.items[0].inventory_item_id ||
      !data.items[0].quantity_requested
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql.begin(async (sql) => {
      // Generate transfer number
      const transferNumber = `TR${Date.now().toString().slice(-8)}`

      // Create transfer record
      const transfer = await sql`
        INSERT INTO warehouse_transfers (
          transfer_number, from_warehouse_id, to_warehouse_id, transfer_date,
          expected_arrival_date, status, total_items, total_value,
          initiated_by, notes
        ) VALUES (
          ${transferNumber}, ${data.from_warehouse_id}, ${data.to_warehouse_id},
          ${data.transfer_date}, ${null},
          ${"pending"}, ${data.items?.length || 0},
          ${data.items[0].total_cost || 0}, ${data.initiated_by || 1}, ${data.notes || null}
        )
        RETURNING *
      `

      const transferId = transfer[0].id

      // Add transfer items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await sql`
            INSERT INTO warehouse_transfer_items (
              transfer_id, inventory_item_id, quantity_requested,
              unit_cost, total_cost, serial_numbers
            ) VALUES (
              ${transferId}, ${item.inventory_item_id}, ${item.quantity_requested},
              ${item.unit_cost}, ${item.total_cost}, ${item.serial_numbers || null}
            )
          `

          // Reserve stock in source warehouse
          await sql`
            INSERT INTO stock_reservations (
              inventory_item_id, warehouse_id, reserved_quantity,
              reservation_type, reference_id, reserved_by, status
            ) VALUES (
              ${item.inventory_item_id}, ${data.from_warehouse_id}, ${item.quantity_requested},
              'transfer', ${transferId}, ${data.initiated_by || 1}, 'active'
            )
          `
        }
      }

      return transfer[0]
    })

    console.log("[v0] Transfer created successfully:", result.id)

    return NextResponse.json({
      success: true,
      message: "Warehouse transfer created successfully",
      transfer: result,
    })
  } catch (error) {
    console.error("Error creating warehouse transfer:", error)
    return NextResponse.json({ error: "Failed to create warehouse transfer" }, { status: 500 })
  }
}
