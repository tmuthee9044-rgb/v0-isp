import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let movements

    if (customerId) {
      // Get movements for a specific customer
      movements = await sql`
        SELECT 
          im.id,
          im.movement_type as type,
          COALESCE(ii.name, 'Unknown Item') as item_name,
          ii.sku,
          ii.category,
          im.quantity,
          im.reason,
          im.notes,
          im.status,
          im.created_at,
          im.performed_by,
          im.unit_cost,
          im.total_cost
        FROM inventory_movements im
        LEFT JOIN inventory_items ii ON im.item_id = ii.id
        WHERE im.movement_type = 'assigned' 
        AND im.notes LIKE ${`%customer_id:${customerId}%`}
        ORDER BY im.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      // Get all movements
      movements = await sql`
        SELECT 
          im.id,
          im.movement_type as type,
          COALESCE(ii.name, 'Unknown Item') as item_name,
          ii.sku,
          ii.category,
          im.quantity,
          im.from_location,
          im.to_location,
          im.reason,
          im.notes,
          im.status,
          im.created_at,
          im.performed_by,
          im.unit_cost,
          im.total_cost
        FROM inventory_movements im
        LEFT JOIN inventory_items ii ON im.item_id = ii.id
        ORDER BY im.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    return NextResponse.json({
      success: true,
      data: movements,
      total: movements.length,
    })
  } catch (error) {
    console.error("Error fetching inventory movements:", error)

    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inventory_item_id,
      customer_id,
      movement_type,
      quantity,
      reason,
      condition_before,
      notes,
      unit_cost,
      performed_by = "System",
    } = body

    if (!inventory_item_id || !movement_type || !quantity) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: inventory_item_id, movement_type, quantity" },
        { status: 400 },
      )
    }

    // Get item details for cost calculation
    const [item] = await sql`
      SELECT unit_cost, name, quantity_in_stock 
      FROM inventory_items 
      WHERE id = ${inventory_item_id}
    `

    if (!item) {
      return NextResponse.json({ success: false, error: "Inventory item not found" }, { status: 404 })
    }

    // Check stock availability for assignments
    if (movement_type === "assigned" && item.quantity_in_stock < quantity) {
      return NextResponse.json({ success: false, error: "Insufficient stock available" }, { status: 400 })
    }

    const calculatedUnitCost = unit_cost || item.unit_cost || 0
    const totalCost = calculatedUnitCost * quantity

    let enhancedNotes = notes || reason || ""
    if (customer_id && movement_type === "assigned") {
      enhancedNotes = `${enhancedNotes} | customer_id:${customer_id}`
    }

    // Create the movement record
    const result = await sql`
      INSERT INTO inventory_movements (
        item_id, movement_type, quantity, reason, notes, 
        unit_cost, total_cost, performed_by, status, created_at
      ) VALUES (
        ${inventory_item_id}, 
        ${movement_type}, 
        ${movement_type === "assigned" ? -Math.abs(quantity) : quantity}, 
        ${reason || `${movement_type} operation`},
        ${enhancedNotes},
        ${calculatedUnitCost},
        ${totalCost},
        ${performed_by},
        'completed',
        NOW()
      )
      RETURNING *
    `

    if (movement_type === "assigned") {
      await sql`
        UPDATE inventory_items 
        SET quantity_in_stock = quantity_in_stock - ${quantity},
            updated_at = NOW()
        WHERE id = ${inventory_item_id}
      `
    } else if (movement_type === "returned") {
      await sql`
        UPDATE inventory_items 
        SET quantity_in_stock = quantity_in_stock + ${quantity},
            updated_at = NOW()
        WHERE id = ${inventory_item_id}
      `
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: `Equipment ${movement_type} successfully`,
    })
  } catch (error) {
    console.error("Error creating inventory movement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create inventory movement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
