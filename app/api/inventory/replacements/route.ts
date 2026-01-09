import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Equipment replacement workflow
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { customer_id, old_equipment_id, new_inventory_item_id, replacement_reason, performed_by = 1 } = data

    const result = await sql.begin(async (sql) => {
      // Get old equipment details
      const oldEquipment = await sql`
        SELECT * FROM customer_equipment 
        WHERE id = ${old_equipment_id} AND customer_id = ${customer_id}
      `

      if (oldEquipment.length === 0) {
        throw new Error("Old equipment not found")
      }

      const equipment = oldEquipment[0]

      // Check if new equipment is available
      const availableStock = await sql`
        SELECT 
          il.quantity,
          COALESCE(SUM(sr.reserved_quantity), 0) as total_reserved,
          ii.name,
          ii.unit_cost
        FROM inventory_locations il
        JOIN inventory_items ii ON il.inventory_item_id = ii.id
        LEFT JOIN stock_reservations sr ON il.inventory_item_id = sr.inventory_item_id 
          AND il.warehouse_id = sr.warehouse_id AND sr.status = 'active'
        WHERE il.inventory_item_id = ${new_inventory_item_id}
        GROUP BY il.quantity, ii.name, ii.unit_cost
        HAVING (il.quantity - COALESCE(SUM(sr.reserved_quantity), 0)) >= 1
        LIMIT 1
      `

      if (availableStock.length === 0) {
        throw new Error("New equipment not available in stock")
      }

      const newEquipmentInfo = availableStock[0]

      // Mark old equipment as returned/retired
      await sql`
        UPDATE customer_equipment 
        SET 
          status = 'returned',
          return_date = CURRENT_DATE,
          condition_notes = ${`Replaced due to: ${replacement_reason}`},
          updated_at = NOW()
        WHERE id = ${old_equipment_id}
      `

      // Issue new equipment
      const newEquipment = await sql`
        INSERT INTO customer_equipment (
          customer_id, inventory_item_id, equipment_name, equipment_type,
          quantity, unit_price, total_price, issued_date, status, condition_notes
        ) VALUES (
          ${customer_id}, ${new_inventory_item_id}, ${newEquipmentInfo.name},
          ${equipment.equipment_type}, 1, ${newEquipmentInfo.unit_cost},
          ${newEquipmentInfo.unit_cost}, CURRENT_DATE, 'issued',
          ${`Replacement for equipment ID: ${old_equipment_id}`}
        )
        RETURNING *
      `

      // Update inventory - return old equipment to stock if it's reusable
      if (replacement_reason !== "damaged" && replacement_reason !== "lost") {
        // Return old equipment to inventory
        await sql`
          UPDATE inventory_locations 
          SET quantity = quantity + 1
          WHERE inventory_item_id = ${equipment.inventory_item_id}
          AND warehouse_id = (SELECT id FROM warehouses WHERE warehouse_code = 'MAIN' LIMIT 1)
        `

        // Record return movement
        await sql`
          INSERT INTO inventory_movements (
            inventory_item_id, movement_type, quantity, reference_type, reference_id,
            to_location, reason, performed_by
          ) VALUES (
            ${equipment.inventory_item_id}, 'in', 1, 'equipment_return', ${old_equipment_id},
            (SELECT id FROM warehouses WHERE warehouse_code = 'MAIN' LIMIT 1),
            'Equipment returned from replacement', ${performed_by}
          )
        `
      }

      // Issue new equipment from inventory
      await sql`
        UPDATE inventory_locations 
        SET quantity = quantity - 1
        WHERE inventory_item_id = ${new_inventory_item_id}
        AND warehouse_id = (SELECT id FROM warehouses WHERE warehouse_code = 'MAIN' LIMIT 1)
      `

      // Record issue movement
      await sql`
        INSERT INTO inventory_movements (
          inventory_item_id, movement_type, quantity, reference_type, reference_id,
          from_location, reason, performed_by
        ) VALUES (
          ${new_inventory_item_id}, 'out', 1, 'equipment_replacement', ${newEquipment[0].id},
          (SELECT id FROM warehouses WHERE warehouse_code = 'MAIN' LIMIT 1),
          'Equipment issued as replacement', ${performed_by}
        )
      `

      // Log the replacement activity
      await sql`
        INSERT INTO system_logs (
          level, source, category, message, details, customer_id, user_id
        ) VALUES (
          'INFO', 'Inventory Management', 'equipment_replacement',
          'Equipment replacement completed',
          ${JSON.stringify({
            old_equipment_id,
            new_equipment_id: newEquipment[0].id,
            replacement_reason,
            old_equipment_name: equipment.equipment_name,
            new_equipment_name: newEquipmentInfo.name,
          })},
          ${customer_id}, ${performed_by}
        )
      `

      return {
        old_equipment: {
          id: equipment.id,
          name: equipment.equipment_name,
          status: "returned",
        },
        new_equipment: {
          id: newEquipment[0].id,
          name: newEquipmentInfo.name,
          status: "issued",
        },
        replacement_reason,
      }
    })

    return NextResponse.json({
      success: true,
      message: "Equipment replacement completed successfully",
      replacement: result,
    })
  } catch (error) {
    console.error("Error processing equipment replacement:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to process equipment replacement",
      },
      { status: 500 },
    )
  }
}

// Get replacement history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")

    let query = `
      SELECT 
        ce_old.id as old_equipment_id,
        ce_old.equipment_name as old_equipment_name,
        ce_old.return_date,
        ce_old.condition_notes,
        ce_new.id as new_equipment_id,
        ce_new.equipment_name as new_equipment_name,
        ce_new.issued_date,
        c.first_name,
        c.last_name,
        sl.details
      FROM customer_equipment ce_old
      JOIN customers c ON ce_old.customer_id = c.id
      LEFT JOIN system_logs sl ON sl.customer_id = c.id 
        AND sl.category = 'equipment_replacement'
        AND sl.details::jsonb->>'old_equipment_id' = ce_old.id::text
      LEFT JOIN customer_equipment ce_new ON ce_new.id = (sl.details::jsonb->>'new_equipment_id')::integer
      WHERE ce_old.status = 'returned'
      AND ce_old.condition_notes LIKE '%Replaced due to:%'
    `

    const params = []
    let paramIndex = 1

    if (customerId) {
      query += ` AND ce_old.customer_id = $${paramIndex}`
      params.push(customerId)
      paramIndex++
    }

    query += ` ORDER BY ce_old.return_date DESC`

    const result = await sql.query(query, params)

    const replacements = result.rows.map((rep: any) => ({
      old_equipment_id: rep.old_equipment_id,
      old_equipment_name: rep.old_equipment_name,
      new_equipment_id: rep.new_equipment_id,
      new_equipment_name: rep.new_equipment_name,
      return_date: rep.return_date,
      issued_date: rep.issued_date,
      customer_name: `${rep.first_name} ${rep.last_name}`,
      replacement_details: rep.details ? JSON.parse(rep.details) : null,
    }))

    return NextResponse.json({
      success: true,
      replacements,
    })
  } catch (error) {
    console.error("Error fetching replacement history:", error)
    return NextResponse.json({ error: "Failed to fetch replacement history" }, { status: 500 })
  }
}
