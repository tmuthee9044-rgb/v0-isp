import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Inventory Movement Audit Report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const movementType = searchParams.get("movement_type")
    const itemId = searchParams.get("item_id")
    const warehouseId = searchParams.get("warehouse_id")
    const performedBy = searchParams.get("performed_by")
    const format = searchParams.get("format") || "json"

    let query = `
      SELECT 
        im.*,
        ii.name as item_name,
        ii.sku,
        ii.category,
        wf.name as from_warehouse_name,
        wt.name as to_warehouse_name,
        u.username as performed_by_name,
        CASE 
          WHEN im.reference_type = 'customer_allocation' THEN 
            (SELECT CONCAT(c.first_name, ' ', c.last_name) FROM customers c WHERE c.id = im.reference_id)
          WHEN im.reference_type = 'purchase_order' THEN 
            (SELECT po.po_number FROM purchase_orders po WHERE po.id = im.reference_id)
          WHEN im.reference_type = 'transfer' THEN 
            (SELECT wt.transfer_number FROM warehouse_transfers wt WHERE wt.id = im.reference_id)
          ELSE im.reference_id::text
        END as reference_details
      FROM inventory_movements im
      JOIN inventory_items ii ON im.inventory_item_id = ii.id
      LEFT JOIN warehouses wf ON im.from_location::integer = wf.id
      LEFT JOIN warehouses wt ON im.to_location::integer = wt.id
      LEFT JOIN users u ON im.performed_by = u.id
      WHERE 1=1
    `

    const params = []
    let paramIndex = 1

    if (startDate) {
      query += ` AND im.created_at >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND im.created_at <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (movementType && movementType !== "all") {
      query += ` AND im.movement_type = $${paramIndex}`
      params.push(movementType)
      paramIndex++
    }

    if (itemId) {
      query += ` AND im.inventory_item_id = $${paramIndex}`
      params.push(itemId)
      paramIndex++
    }

    if (warehouseId) {
      query += ` AND (im.from_location::integer = $${paramIndex} OR im.to_location::integer = $${paramIndex})`
      params.push(warehouseId)
      paramIndex++
    }

    if (performedBy) {
      query += ` AND im.performed_by = $${paramIndex}`
      params.push(performedBy)
      paramIndex++
    }

    query += ` ORDER BY im.created_at DESC LIMIT 1000`

    const result = await sql.query(query, params)

    // Get movement summary by type
    const movementSummary = await sql`
      SELECT 
        im.movement_type,
        COUNT(*) as transaction_count,
        SUM(im.quantity) as total_quantity,
        SUM(im.total_value) as total_value,
        COUNT(DISTINCT im.inventory_item_id) as unique_items,
        COUNT(DISTINCT im.performed_by) as unique_users
      FROM inventory_movements im
      WHERE 1=1
      ${startDate ? sql`AND im.created_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND im.created_at <= ${endDate}` : sql``}
      ${movementType && movementType !== "all" ? sql`AND im.movement_type = ${movementType}` : sql``}
      ${itemId ? sql`AND im.inventory_item_id = ${itemId}` : sql``}
      GROUP BY im.movement_type
      ORDER BY total_value DESC
    `

    // Get movement summary by reference type
    const referenceTypeSummary = await sql`
      SELECT 
        im.reference_type,
        COUNT(*) as transaction_count,
        SUM(im.quantity) as total_quantity,
        SUM(im.total_value) as total_value
      FROM inventory_movements im
      WHERE 1=1
      ${startDate ? sql`AND im.created_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND im.created_at <= ${endDate}` : sql``}
      ${movementType && movementType !== "all" ? sql`AND im.movement_type = ${movementType}` : sql``}
      ${itemId ? sql`AND im.inventory_item_id = ${itemId}` : sql``}
      GROUP BY im.reference_type
      ORDER BY total_value DESC
    `

    const response = {
      movements: result.rows,
      summary: {
        by_movement_type: movementSummary,
        by_reference_type: referenceTypeSummary,
        total_movements: result.rows.length,
        date_range: {
          start: startDate,
          end: endDate,
        },
      },
      filters: {
        movement_type: movementType,
        item_id: itemId,
        warehouse_id: warehouseId,
        performed_by: performedBy,
      },
    }

    return Response.json(response)
  } catch (error) {
    console.error("Error generating movement audit report:", error)
    return Response.json({ error: "Failed to generate movement audit report" }, { status: 500 })
  }
}
