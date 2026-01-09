import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Get customer equipment
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const status = searchParams.get("status") || "all"

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID is required",
        },
        { status: 400 },
      )
    }

    let query = `
      SELECT 
        ce.id,
        ce.equipment_name,
        ce.equipment_type,
        ce.serial_number,
        ce.mac_address,
        ce.quantity,
        ce.unit_price,
        ce.total_price,
        ce.issued_date,
        ce.return_date,
        ce.status,
        ce.condition_notes,
        ii.name as inventory_name,
        ii.category,
        ii.sku,
        ii.location as warehouse_location,
        c.first_name,
        c.last_name,
        c.email
      FROM customer_equipment ce
      LEFT JOIN inventory_items ii ON ce.inventory_item_id = ii.id
      LEFT JOIN customers c ON ce.customer_id = c.id
      WHERE ce.customer_id = $1
    `

    const params = [customerId]

    if (status !== "all") {
      query += ` AND ce.status = $2`
      params.push(status)
    }

    query += ` ORDER BY ce.issued_date DESC`

    const result = await sql.query(query, params)

    const equipment = result.rows.map((row) => ({
      id: row.id,
      equipment_name: row.equipment_name,
      equipment_type: row.equipment_type,
      serial_number: row.serial_number,
      mac_address: row.mac_address,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total_price: Number(row.total_price),
      issued_date: row.issued_date,
      return_date: row.return_date,
      status: row.status,
      condition_notes: row.condition_notes,
      inventory_details: {
        name: row.inventory_name,
        category: row.category,
        sku: row.sku,
        warehouse_location: row.warehouse_location,
      },
      customer: {
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
      },
    }))

    // Get summary statistics
    const summary = await sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued_items,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_items,
        COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damaged_items,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_items,
        SUM(total_price) as total_value,
        SUM(CASE WHEN status = 'issued' THEN total_price ELSE 0 END) as active_value
      FROM customer_equipment
      WHERE customer_id = ${customerId}
    `

    return NextResponse.json({
      success: true,
      equipment,
      summary: {
        total_items: Number(summary[0].total_items),
        issued_items: Number(summary[0].issued_items),
        returned_items: Number(summary[0].returned_items),
        damaged_items: Number(summary[0].damaged_items),
        lost_items: Number(summary[0].lost_items),
        total_value: Number(summary[0].total_value),
        active_value: Number(summary[0].active_value),
      },
    })
  } catch (error) {
    console.error("Customer equipment fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer equipment",
      },
      { status: 500 },
    )
  }
}

// Update equipment status (return, damage, etc.)
export async function PUT(request: Request) {
  try {
    const { equipment_id, status, condition_notes, return_reason, performed_by } = await request.json()

    if (!equipment_id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Equipment ID and status are required",
        },
        { status: 400 },
      )
    }

    const result = await sql.begin(async (sql) => {
      // Get current equipment details
      const currentEquipment = await sql`
        SELECT 
          ce.*,
          ii.name as item_name,
          c.first_name,
          c.last_name
        FROM customer_equipment ce
        LEFT JOIN inventory_items ii ON ce.inventory_item_id = ii.id
        LEFT JOIN customers c ON ce.customer_id = c.id
        WHERE ce.id = ${equipment_id}
      `

      if (currentEquipment.length === 0) {
        throw new Error("Equipment not found")
      }

      const equipment = currentEquipment[0]

      // Update equipment status
      const updateData = {
        status,
        condition_notes: condition_notes || equipment.condition_notes,
        updated_at: new Date(),
      }

      if (status === "returned") {
        updateData.return_date = new Date()
      }

      await sql`
        UPDATE customer_equipment 
        SET 
          status = ${status},
          condition_notes = ${updateData.condition_notes},
          return_date = ${status === "returned" ? updateData.return_date : equipment.return_date},
          updated_at = NOW()
        WHERE id = ${equipment_id}
      `

      // If equipment is returned, update inventory stock
      if (status === "returned" && equipment.inventory_item_id) {
        await sql`
          UPDATE inventory_items 
          SET stock_quantity = stock_quantity + ${equipment.quantity}
          WHERE id = ${equipment.inventory_item_id}
        `

        // Record inventory movement
        await sql`
          INSERT INTO inventory_movements (
            inventory_item_id, movement_type, quantity, reference_type, reference_id,
            unit_price, total_value, notes, performed_by
          )
          VALUES (
            ${equipment.inventory_item_id}, 'in', ${equipment.quantity}, 'customer_return', ${equipment.customer_id},
            ${equipment.unit_price}, ${equipment.total_price},
            ${`Equipment returned: ${return_reason || "Customer service termination"}`}, ${performed_by || 1}
          )
        `
      }

      // Log the equipment status change
      await sql`
        INSERT INTO customer_logs (
          customer_id, action, description, performed_by, metadata
        )
        VALUES (
          ${equipment.customer_id}, 'equipment_status_change',
          ${`Equipment ${equipment.equipment_name} status changed to ${status}`},
          ${performed_by || 1},
          ${JSON.stringify({
            equipment_id,
            old_status: equipment.status,
            new_status: status,
            return_reason,
            condition_notes,
          })}
        )
      `

      return {
        equipment_id,
        old_status: equipment.status,
        new_status: status,
        customer: `${equipment.first_name} ${equipment.last_name}`,
        equipment_name: equipment.equipment_name,
      }
    })

    return NextResponse.json({
      success: true,
      message: "Equipment status updated successfully",
      data: result,
    })
  } catch (error) {
    console.error("Equipment status update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update equipment status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
