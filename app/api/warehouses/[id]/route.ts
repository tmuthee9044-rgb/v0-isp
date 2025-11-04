import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const warehouseId = Number.parseInt(params.id)

    if (isNaN(warehouseId)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 })
    }

    // Get warehouse details with inventory summary
    const warehouseResult = await sql`
      SELECT 
        w.*,
        COUNT(ii.id) as item_count,
        COALESCE(SUM(ii.stock_quantity), 0) as total_items,
        COALESCE(SUM(ii.stock_quantity * ii.unit_cost), 0) as total_value,
        COUNT(CASE WHEN ii.stock_quantity <= 0 THEN 1 END) as low_stock_items
      FROM warehouses w
      LEFT JOIN inventory_items ii ON w.id = ii.warehouse_id
      WHERE w.id = ${warehouseId}
      GROUP BY w.id
    `

    if (warehouseResult.length === 0) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 })
    }

    const warehouse = warehouseResult[0]

    // Get inventory items in this warehouse
    const inventoryItems = await sql`
      SELECT 
        ii.*,
        COALESCE(ii.stock_quantity, 0) as current_stock,
        COALESCE(ii.stock_quantity * ii.unit_cost, 0) as stock_value
      FROM inventory_items ii
      WHERE ii.warehouse_id = ${warehouseId}
      ORDER BY ii.name
    `

    // Get recent inventory movements for this warehouse
    const recentMovements = await sql`
      SELECT 
        im.*,
        ii.name as item_name,
        ii.sku,
        wf.name as from_warehouse_name,
        wt.name as to_warehouse_name,
        u.username as created_by_name
      FROM inventory_movements im
      JOIN inventory_items ii ON im.item_id = ii.id
      LEFT JOIN warehouses wf ON im.from_warehouse_id = wf.id
      LEFT JOIN warehouses wt ON im.to_warehouse_id = wt.id
      LEFT JOIN users u ON im.created_by = u.id
      WHERE im.from_warehouse_id = ${warehouseId} OR im.to_warehouse_id = ${warehouseId}
      ORDER BY im.created_at DESC
      LIMIT 20
    `

    return NextResponse.json({
      success: true,
      data: {
        ...warehouse,
        item_count: Number(warehouse.item_count || 0),
        total_items: Number(warehouse.total_items || 0),
        total_value: Number(warehouse.total_value || 0),
        low_stock_items: Number(warehouse.low_stock_items || 0),
        inventory_items: inventoryItems.map((item: any) => ({
          ...item,
          current_stock: Number(item.current_stock || 0),
          stock_value: Number(item.stock_value || 0),
        })),
        recent_movements: recentMovements.map((movement: any) => ({
          ...movement,
          quantity: Number(movement.quantity || 0),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching warehouse:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch warehouse",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const warehouseId = Number.parseInt(params.id)

    if (isNaN(warehouseId)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 })
    }

    // Check if warehouse exists
    const existingWarehouse = await sql`
      SELECT * FROM warehouses WHERE id = ${warehouseId}
    `

    if (existingWarehouse.length === 0) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 })
    }

    const contentType = request.headers.get("content-type")
    let data: any

    if (contentType?.includes("application/json")) {
      data = await request.json()
    } else {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries())
    }

    const { name, location, contact_person, phone, email } = data

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Warehouse name is required" }, { status: 400 })
    }

    // Check for duplicate name (excluding current warehouse)
    const duplicateCheck = await sql`
      SELECT id, name FROM warehouses 
      WHERE LOWER(name) = LOWER(${name.trim()}) AND id != ${warehouseId}
    `

    if (duplicateCheck.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `A warehouse with name "${name}" already exists`,
          duplicate: true,
          field: "name",
        },
        { status: 409 },
      )
    }

    // Update warehouse
    const result = await sql`
      UPDATE warehouses 
      SET 
        name = ${name.trim()},
        location = ${location?.trim() || existingWarehouse[0].location},
        contact_person = ${contact_person?.trim() || existingWarehouse[0].contact_person},
        phone = ${phone?.trim() || existingWarehouse[0].phone},
        email = ${email?.trim() || existingWarehouse[0].email},
        updated_at = NOW()
      WHERE id = ${warehouseId}
      RETURNING *
    `

    // Log warehouse update
    try {
      await sql`
        INSERT INTO system_logs (
          category, level, message, details, created_at, timestamp
        ) VALUES (
          'warehouse', 'info', 'Warehouse updated',
          ${JSON.stringify({
            warehouseId: result[0].id,
            name: result[0].name,
            changes: data,
          })},
          NOW(), NOW()
        )
      `
    } catch (logError) {
      console.log("[v0] System log creation failed:", logError)
    }

    return NextResponse.json({
      success: true,
      message: "Warehouse updated successfully",
      data: result[0],
    })
  } catch (error) {
    console.error("Error updating warehouse:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update warehouse",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const warehouseId = Number.parseInt(params.id)

    if (isNaN(warehouseId)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 })
    }

    // Check if warehouse exists
    const existingWarehouse = await sql`
      SELECT * FROM warehouses WHERE id = ${warehouseId}
    `

    if (existingWarehouse.length === 0) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 })
    }

    // Check if warehouse has inventory items
    const inventoryCheck = await sql`
      SELECT COUNT(*) as item_count FROM inventory_items 
      WHERE warehouse_id = ${warehouseId}
    `

    if (Number(inventoryCheck[0].item_count) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete warehouse with inventory items. Please move or remove all items first.",
        },
        { status: 400 },
      )
    }

    // Soft delete - mark as inactive instead of hard delete
    const result = await sql`
      UPDATE warehouses 
      SET 
        name = name || ' (DELETED)',
        updated_at = NOW()
      WHERE id = ${warehouseId}
      RETURNING *
    `

    // Log warehouse deletion
    try {
      await sql`
        INSERT INTO system_logs (
          category, level, message, details, created_at, timestamp
        ) VALUES (
          'warehouse', 'info', 'Warehouse soft deleted',
          ${JSON.stringify({
            warehouseId: result[0].id,
            name: existingWarehouse[0].name,
          })},
          NOW(), NOW()
        )
      `
    } catch (logError) {
      console.log("[v0] System log creation failed:", logError)
    }

    return NextResponse.json({
      success: true,
      message: `Warehouse "${existingWarehouse[0].name}" has been deleted successfully`,
    })
  } catch (error) {
    console.error("Error deleting warehouse:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete warehouse",
      },
      { status: 500 },
    )
  }
}
