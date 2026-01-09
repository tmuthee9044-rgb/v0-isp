import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get stock adjustments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get("warehouse_id")
    const itemId = searchParams.get("item_id")
    const adjustmentType = searchParams.get("type")

    let query = `
      SELECT 
        sa.*,
        ii.name as item_name,
        ii.sku,
        w.name as warehouse_name,
        u.username as performed_by_name,
        ua.username as approved_by_name
      FROM stock_adjustments sa
      JOIN inventory_items ii ON sa.inventory_item_id = ii.id
      LEFT JOIN warehouses w ON sa.warehouse_id = w.id
      LEFT JOIN users u ON sa.performed_by = u.id
      LEFT JOIN users ua ON sa.approved_by = ua.id
      WHERE 1=1
    `

    const params = []
    let paramIndex = 1

    if (warehouseId) {
      query += ` AND sa.warehouse_id = $${paramIndex}`
      params.push(warehouseId)
      paramIndex++
    }

    if (itemId) {
      query += ` AND sa.inventory_item_id = $${paramIndex}`
      params.push(itemId)
      paramIndex++
    }

    if (adjustmentType) {
      query += ` AND sa.adjustment_type = $${paramIndex}`
      params.push(adjustmentType)
      paramIndex++
    }

    query += ` ORDER BY sa.created_at DESC LIMIT 100`

    const result = await sql.query(query, params)

    const adjustments = result.rows.map((adj: any) => ({
      id: adj.id,
      adjustment_number: adj.adjustment_number,
      inventory_item_id: adj.inventory_item_id,
      item_name: adj.item_name,
      sku: adj.sku,
      warehouse_id: adj.warehouse_id,
      warehouse_name: adj.warehouse_name,
      adjustment_type: adj.adjustment_type,
      quantity_before: Number(adj.quantity_before),
      quantity_after: Number(adj.quantity_after),
      adjustment_quantity: Number(adj.adjustment_quantity),
      unit_cost: Number(adj.unit_cost),
      total_value: Number(adj.total_value),
      reason: adj.reason,
      description: adj.description,
      performed_by: adj.performed_by,
      performed_by_name: adj.performed_by_name,
      approved_by: adj.approved_by,
      approved_by_name: adj.approved_by_name,
      approved_at: adj.approved_at,
      created_at: adj.created_at,
    }))

    return NextResponse.json({
      success: true,
      adjustments,
      summary: {
        total_adjustments: adjustments.length,
        total_value_impact: adjustments.reduce((sum, adj) => sum + adj.total_value, 0),
        increases: adjustments.filter((adj) => adj.adjustment_type === "increase").length,
        decreases: adjustments.filter((adj) => adj.adjustment_type === "decrease").length,
      },
    })
  } catch (error) {
    console.error("Error fetching stock adjustments:", error)
    return NextResponse.json({ error: "Failed to fetch stock adjustments" }, { status: 500 })
  }
}

// Create stock adjustment
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 })
    }

    let data
    try {
      data = await request.json()
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError)
      return NextResponse.json({ error: "Invalid JSON format in request body" }, { status: 400 })
    }

    const requiredFields = [
      "inventory_item_id",
      "warehouse_id",
      "adjustment_type",
      "adjustment_quantity",
      "unit_cost",
      "reason",
    ]
    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const numericFields = ["inventory_item_id", "warehouse_id", "adjustment_quantity", "unit_cost"]
    for (const field of numericFields) {
      const value = Number(data[field])
      if (isNaN(value) || !isFinite(value)) {
        return NextResponse.json({ error: `Invalid numeric value for field: ${field}` }, { status: 400 })
      }
      data[field] = value
    }

    if (!["increase", "decrease"].includes(data.adjustment_type)) {
      return NextResponse.json({ error: "adjustment_type must be 'increase' or 'decrease'" }, { status: 400 })
    }

    if (data.adjustment_quantity <= 0) {
      return NextResponse.json({ error: "adjustment_quantity must be greater than 0" }, { status: 400 })
    }

    if (data.unit_cost < 0) {
      return NextResponse.json({ error: "unit_cost cannot be negative" }, { status: 400 })
    }

    const result = await sql.begin(async (sql) => {
      // Get current stock level
      const currentStock = await sql`
        SELECT quantity FROM inventory_locations 
        WHERE inventory_item_id = ${data.inventory_item_id} 
        AND warehouse_id = ${data.warehouse_id}
      `

      if (currentStock.length === 0) {
        throw new Error("Item not found in specified warehouse")
      }

      const quantityBefore = Number(currentStock[0].quantity)
      const adjustmentQty = Number(data.adjustment_quantity)
      const quantityAfter =
        data.adjustment_type === "increase" ? quantityBefore + adjustmentQty : quantityBefore - adjustmentQty

      if (quantityAfter < 0) {
        throw new Error("Adjustment would result in negative stock")
      }

      // Generate adjustment number
      const adjustmentNumber = `ADJ${Date.now().toString().slice(-8)}`

      const unitCost = Number(data.unit_cost)
      const totalValue = adjustmentQty * unitCost

      // Create adjustment record
      const adjustment = await sql`
        INSERT INTO stock_adjustments (
          adjustment_number, inventory_item_id, warehouse_id, adjustment_type,
          quantity_before, quantity_after, adjustment_quantity, unit_cost,
          total_value, reason, description, performed_by
        ) VALUES (
          ${adjustmentNumber}, ${data.inventory_item_id}, ${data.warehouse_id},
          ${data.adjustment_type}, ${quantityBefore}, ${quantityAfter}, ${adjustmentQty},
          ${unitCost}, ${totalValue}, ${data.reason},
          ${data.description || null}, ${data.performed_by || 1}
        )
        RETURNING *
      `

      // Update inventory location
      await sql`
        UPDATE inventory_locations 
        SET quantity = ${quantityAfter}, updated_at = NOW()
        WHERE inventory_item_id = ${data.inventory_item_id} 
        AND warehouse_id = ${data.warehouse_id}
      `

      // Record inventory movement
      await sql`
        INSERT INTO inventory_movements (
          inventory_item_id, movement_type, quantity, unit_price, total_value,
          reference_type, reference_id, to_location, reason, performed_by
        ) VALUES (
          ${data.inventory_item_id}, ${data.adjustment_type === "increase" ? "in" : "out"},
          ${adjustmentQty}, ${unitCost}, ${totalValue},
          'adjustment', ${adjustment[0].id}, ${data.warehouse_id},
          ${`Stock adjustment: ${data.reason}`}, ${data.performed_by || 1}
        )
      `

      return adjustment[0]
    })

    return NextResponse.json({
      success: true,
      message: "Stock adjustment created successfully",
      adjustment: result,
    })
  } catch (error) {
    console.error("Error creating stock adjustment:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create stock adjustment",
      },
      { status: 500 },
    )
  }
}
