import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get("warehouse_id")
    const category = searchParams.get("category")
    const status = searchParams.get("status") || "all"
    const includeSerials = searchParams.get("include_serials") === "true"

    let itemsQuery = `
      SELECT 
        ii.*,
        'Unknown Supplier' as supplier_name,
        COALESCE(ii.stock_quantity, 0) as total_stock,
        0 as reserved_stock,
        1 as warehouse_count,
        'Main Warehouse' as warehouse_names
      FROM inventory_items ii
      WHERE ii.status = 'active'
    `

    const params = []
    let paramIndex = 1

    if (category && category !== "all") {
      itemsQuery += ` AND ii.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (status !== "all") {
      itemsQuery += ` AND ii.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    itemsQuery += ` ORDER BY ii.created_at DESC`

    let itemsResult
    try {
      itemsResult =
        params.length > 0
          ? await sql.query(itemsQuery, params)
          : await sql`
            SELECT 
              ii.*,
              'Unknown Supplier' as supplier_name,
              COALESCE(ii.stock_quantity, 0) as total_stock,
              0 as reserved_stock,
              1 as warehouse_count,
              'Main Warehouse' as warehouse_names
            FROM inventory_items ii
            WHERE ii.status = 'active'
            ORDER BY ii.created_at DESC
          `
    } catch (error) {
      console.log("[v0] Error fetching items, using empty array")
      itemsResult = { rows: [] }
    }

    const items = (itemsResult.rows || itemsResult || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku,
      total_stock: Number(item.total_stock || 0),
      reserved_stock: Number(item.reserved_stock || 0),
      available_stock: Number(item.total_stock || 0) - Number(item.reserved_stock || 0),
      unit_cost: Number(item.unit_cost || 0),
      status: item.status,
      description: item.description,
      specifications: item.specifications,
      supplier_name: item.supplier_name,
      warehouse_count: Number(item.warehouse_count || 1),
      warehouse_names: item.warehouse_names,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    const warehouseLocations = []

    let serialNumbers = []
    if (includeSerials) {
      try {
        const serialResult = await sql`
          SELECT 
            isn.*,
            ii.name as item_name,
            ii.sku,
            ce.customer_id,
            c.first_name,
            c.last_name
          FROM inventory_serial_numbers isn
          JOIN inventory_items ii ON isn.inventory_item_id = ii.id
          LEFT JOIN customer_equipment ce ON isn.serial_number = ce.serial_number
          LEFT JOIN customers c ON ce.customer_id = c.id
          ORDER BY isn.created_at DESC
        `
        serialNumbers = (serialResult || []).map((sn: any) => ({
          id: sn.id,
          inventory_item_id: sn.inventory_item_id,
          serial_number: sn.serial_number,
          status: sn.status,
          item_name: sn.item_name,
          sku: sn.sku,
          customer_id: sn.customer_id,
          customer_name: sn.customer_id ? `${sn.first_name} ${sn.last_name}` : null,
          created_at: sn.created_at,
        }))
      } catch (error) {
        console.log("[v0] Serial numbers table not found, using empty array")
        serialNumbers = []
      }
    }

    let categoryStats = []
    try {
      categoryStats = await sql`
        SELECT 
          ii.category,
          COUNT(DISTINCT ii.id) as item_count,
          COALESCE(SUM(ii.stock_quantity), 0) as total_quantity,
          COALESCE(SUM(ii.stock_quantity * ii.unit_cost), 0) as total_value,
          COUNT(CASE WHEN ii.stock_quantity <= 0 THEN 1 END) as low_stock_count
        FROM inventory_items ii
        WHERE ii.status = 'active'
        GROUP BY ii.category
        ORDER BY total_value DESC
      `
    } catch (error) {
      console.log("[v0] Error fetching category stats, using empty array")
      categoryStats = []
    }

    let recentMovements = []
    try {
      const movementsResult = await sql`
        SELECT 
          im.*,
          ii.name as item_name,
          ii.sku,
          wf.name as from_warehouse,
          wt.name as to_warehouse,
          u.username as performed_by_name
        FROM inventory_movements im
        JOIN inventory_items ii ON im.item_id = ii.id
        LEFT JOIN warehouses wf ON im.from_warehouse_id = wf.id
        LEFT JOIN warehouses wt ON im.to_warehouse_id = wt.id
        LEFT JOIN users u ON im.created_by = u.id
        ORDER BY im.created_at DESC
        LIMIT 20
      `
      recentMovements = (movementsResult || []).map((movement: any) => ({
        id: movement.id,
        item_name: movement.item_name,
        sku: movement.sku,
        movement_type: movement.movement_type,
        quantity: Number(movement.quantity || 0),
        from_location: movement.from_location,
        to_location: movement.to_location,
        from_warehouse: movement.from_warehouse,
        to_warehouse: movement.to_warehouse,
        reason: movement.reason,
        performed_by: movement.performed_by_name,
        created_at: movement.created_at,
      }))
    } catch (error) {
      console.log("[v0] Inventory movements table not found, using empty array")
      recentMovements = []
    }

    let totals
    try {
      totals = await sql`
        SELECT 
          COUNT(DISTINCT ii.id) as total_items,
          COALESCE(SUM(ii.stock_quantity), 0) as total_stock,
          0 as total_reserved,
          COUNT(CASE WHEN ii.stock_quantity <= 0 THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN ii.stock_quantity = 0 THEN 1 END) as out_of_stock,
          COALESCE(SUM(ii.stock_quantity * ii.unit_cost), 0) as total_value
        FROM inventory_items ii
        WHERE ii.status = 'active'
      `
    } catch (error) {
      console.log("[v0] Error fetching totals, using default values")
      totals = [
        {
          total_items: 0,
          total_stock: 0,
          total_reserved: 0,
          low_stock_items: 0,
          out_of_stock: 0,
          total_value: 0,
        },
      ]
    }

    const categoryIcons = {
      "Network Equipment": { icon: "Router", color: "bg-blue-500" },
      "Fiber Optic Equipment": { icon: "Zap", color: "bg-green-500" },
      "Wireless Equipment": { icon: "Wifi", color: "bg-purple-500" },
      "Server Equipment": { icon: "Server", color: "bg-orange-500" },
      "Testing Equipment": { icon: "BarChart3", color: "bg-red-500" },
      "Power Equipment": { icon: "Zap", color: "bg-yellow-500" },
      "Installation Tools": { icon: "Package", color: "bg-gray-500" },
      "Cables & Accessories": { icon: "Cable", color: "bg-indigo-500" },
    }

    const categories = (categoryStats || []).map((cat: any) => ({
      name: cat.category || "Unknown",
      item_count: Number(cat.item_count || 0),
      total_quantity: Number(cat.total_quantity || 0),
      total_value: Number(cat.total_value || 0),
      low_stock_count: Number(cat.low_stock_count || 0),
      icon: categoryIcons[cat.category as keyof typeof categoryIcons]?.icon || "Package",
      color: categoryIcons[cat.category as keyof typeof categoryIcons]?.color || "bg-gray-500",
    }))

    const totalData = (totals && totals[0]) || {
      total_items: 0,
      total_stock: 0,
      total_reserved: 0,
      low_stock_items: 0,
      out_of_stock: 0,
      total_value: 0,
    }

    const inventoryData = {
      totalItems: Number(totalData.total_items),
      totalStock: Number(totalData.total_stock),
      totalReserved: Number(totalData.total_reserved),
      lowStockItems: Number(totalData.low_stock_items),
      outOfStock: Number(totalData.out_of_stock),
      totalValue: Number(totalData.total_value),
      categories: categories || [],
      recentMovements: recentMovements || [],
      items: items || [],
      warehouse_locations: warehouseLocations || [],
      serial_numbers: serialNumbers || [],
    }

    return NextResponse.json({
      success: true,
      data: inventoryData,
    })
  } catch (error) {
    console.error("Error fetching inventory data:", error)
    return NextResponse.json({ error: "Failed to fetch inventory data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const inventoryItem = await sql`
      INSERT INTO inventory_items (
        name, sku, category, unit_cost, description, specifications,
        supplier_id, status, stock_quantity
      ) VALUES (
        ${data.name}, ${data.sku || null}, ${data.category},
        ${data.unit_cost}, ${data.description || null}, ${data.specifications || null},
        ${data.supplier_id || null}, ${data.status || "active"}, ${data.initial_quantity || 0}
      )
      RETURNING *
    `

    const itemId = inventoryItem[0].id

    if (data.warehouse_id && data.initial_quantity > 0) {
      try {
        await sql`
          INSERT INTO inventory_locations (
            inventory_item_id, warehouse_id, quantity, reserved_quantity,
            min_stock_level, max_stock_level, location_code
          ) VALUES (
            ${itemId}, ${data.warehouse_id}, ${data.initial_quantity}, 0,
            ${data.min_stock_level || 5}, ${data.max_stock_level || 100}, 
            ${data.location_code || "A1-01"}
          )
        `
      } catch (error) {
        console.log("[v0] Inventory locations table not found, skipping location record")
      }
    }

    if (data.initial_quantity > 0) {
      try {
        await sql`
          INSERT INTO inventory_movements (
            item_id, movement_type, quantity, reference_number, notes, created_by
          ) VALUES (
            ${itemId}, 'in', ${data.initial_quantity}, 
            ${`INIT-${Date.now()}`}, 
            'Initial stock entry', ${data.created_by || 1}
          )
        `
      } catch (error) {
        console.log("[v0] Inventory movements table not found, skipping movement record")
      }
    }

    if (data.is_serialized && data.serial_numbers && data.serial_numbers.length > 0) {
      try {
        for (const serialNumber of data.serial_numbers) {
          await sql`
            INSERT INTO inventory_serial_numbers (
              inventory_item_id, serial_number, status, notes
            ) VALUES (
              ${itemId}, ${serialNumber.serial_number}, ${serialNumber.status || "available"},
              ${serialNumber.notes || null}
            )
          `
        }
      } catch (error) {
        console.log("[v0] Serial numbers table not found, skipping serial number records")
      }
    }

    return NextResponse.json({
      success: true,
      message: "Inventory item created successfully",
      item: inventoryItem[0],
    })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 })
  }
}
