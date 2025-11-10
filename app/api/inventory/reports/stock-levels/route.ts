import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Stock Levels Report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get("warehouse_id")
    const category = searchParams.get("category")
    const supplierId = searchParams.get("supplier_id")
    const stockStatus = searchParams.get("stock_status") // low, normal, overstock, out_of_stock
    const format = searchParams.get("format") || "json"

    let query = `
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        ii.unit_cost,
        ii.min_stock_level,
        ii.max_stock_level,
        ii.is_serialized,
        ii.abc_classification,
        s.company_name as supplier_name,
        w.id as warehouse_id,
        w.name as warehouse_name,
        w.warehouse_code,
        il.quantity,
        il.reserved_quantity,
        il.location_code,
        (il.quantity - il.reserved_quantity) as available_quantity,
        (il.quantity * ii.unit_cost) as total_value,
        CASE 
          WHEN il.quantity = 0 THEN 'out_of_stock'
          WHEN (il.quantity - il.reserved_quantity) <= il.min_stock_level THEN 'low_stock'
          WHEN il.quantity > il.max_stock_level AND il.max_stock_level > 0 THEN 'overstock'
          ELSE 'normal'
        END as stock_status,
        CASE 
          WHEN il.quantity = 0 THEN 'critical'
          WHEN (il.quantity - il.reserved_quantity) <= il.min_stock_level / 2 THEN 'high'
          WHEN (il.quantity - il.reserved_quantity) <= il.min_stock_level THEN 'medium'
          ELSE 'low'
        END as urgency_level
      FROM inventory_items ii
      JOIN inventory_locations il ON ii.id = il.inventory_item_id
      JOIN warehouses w ON il.warehouse_id = w.id
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      WHERE ii.is_active = true
    `

    const params = []
    let paramIndex = 1

    if (warehouseId) {
      query += ` AND w.id = $${paramIndex}`
      params.push(warehouseId)
      paramIndex++
    }

    if (category && category !== "all") {
      query += ` AND ii.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (supplierId) {
      query += ` AND ii.supplier_id = $${paramIndex}`
      params.push(supplierId)
      paramIndex++
    }

    query += ` ORDER BY ii.category, ii.name`

    const result = await sql.query(query, params)

    let stockItems = result.rows.map((item: any) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      supplier_name: item.supplier_name,
      warehouse_id: item.warehouse_id,
      warehouse_name: item.warehouse_name,
      warehouse_code: item.warehouse_code,
      location_code: item.location_code,
      quantity: Number(item.quantity),
      reserved_quantity: Number(item.reserved_quantity),
      available_quantity: Number(item.available_quantity),
      min_stock_level: Number(item.min_stock_level),
      max_stock_level: Number(item.max_stock_level),
      unit_cost: Number(item.unit_cost),
      total_value: Number(item.total_value),
      stock_status: item.stock_status,
      urgency_level: item.urgency_level,
      is_serialized: item.is_serialized,
      abc_classification: item.abc_classification,
    }))

    // Filter by stock status if specified
    if (stockStatus && stockStatus !== "all") {
      stockItems = stockItems.filter((item) => item.stock_status === stockStatus)
    }

    // Get category summary
    const categorySummary = await sql`
      SELECT 
        ii.category,
        COUNT(DISTINCT ii.id) as total_items,
        COUNT(DISTINCT il.warehouse_id) as warehouses_count,
        SUM(il.quantity) as total_quantity,
        SUM(il.reserved_quantity) as total_reserved,
        SUM(il.quantity * ii.unit_cost) as total_value,
        COUNT(CASE WHEN il.quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN (il.quantity - il.reserved_quantity) <= il.min_stock_level THEN 1 END) as low_stock_count
      FROM inventory_items ii
      JOIN inventory_locations il ON ii.id = il.inventory_item_id
      WHERE ii.is_active = true
      ${warehouseId ? `AND il.warehouse_id = ${warehouseId}` : ""}
      ${category && category !== "all" ? `AND ii.category = '${category}'` : ""}
      GROUP BY ii.category
      ORDER BY total_value DESC
    `

    // Get warehouse summary
    const warehouseSummary = await sql`
      SELECT 
        w.id,
        w.name,
        w.warehouse_code,
        COUNT(DISTINCT ii.id) as total_items,
        SUM(il.quantity) as total_quantity,
        SUM(il.reserved_quantity) as total_reserved,
        SUM(il.quantity * ii.unit_cost) as total_value,
        COUNT(CASE WHEN il.quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN (il.quantity - il.reserved_quantity) <= il.min_stock_level THEN 1 END) as low_stock_count
      FROM warehouses w
      JOIN inventory_locations il ON w.id = il.warehouse_id
      JOIN inventory_items ii ON il.inventory_item_id = ii.id
      WHERE ii.is_active = true
      ${warehouseId ? `AND w.id = ${warehouseId}` : ""}
      GROUP BY w.id, w.name, w.warehouse_code
      ORDER BY total_value DESC
    `

    const reportData = {
      report_title: "Stock Levels Report",
      generated_at: new Date().toISOString(),
      filters: {
        warehouse_id: warehouseId,
        category,
        supplier_id: supplierId,
        stock_status: stockStatus,
      },
      summary: {
        total_items: stockItems.length,
        total_quantity: stockItems.reduce((sum, item) => sum + item.quantity, 0),
        total_reserved: stockItems.reduce((sum, item) => sum + item.reserved_quantity, 0),
        total_available: stockItems.reduce((sum, item) => sum + item.available_quantity, 0),
        total_value: stockItems.reduce((sum, item) => sum + item.total_value, 0),
        out_of_stock_items: stockItems.filter((item) => item.stock_status === "out_of_stock").length,
        low_stock_items: stockItems.filter((item) => item.stock_status === "low_stock").length,
        overstock_items: stockItems.filter((item) => item.stock_status === "overstock").length,
        critical_items: stockItems.filter((item) => item.urgency_level === "critical").length,
      },
      category_breakdown: categorySummary.map((cat: any) => ({
        category: cat.category,
        total_items: Number(cat.total_items),
        warehouses_count: Number(cat.warehouses_count),
        total_quantity: Number(cat.total_quantity),
        total_reserved: Number(cat.total_reserved),
        total_value: Number(cat.total_value),
        out_of_stock_count: Number(cat.out_of_stock_count),
        low_stock_count: Number(cat.low_stock_count),
      })),
      warehouse_breakdown: warehouseSummary.map((wh: any) => ({
        warehouse_id: wh.id,
        warehouse_name: wh.name,
        warehouse_code: wh.warehouse_code,
        total_items: Number(wh.total_items),
        total_quantity: Number(wh.total_quantity),
        total_reserved: Number(wh.total_reserved),
        total_value: Number(wh.total_value),
        out_of_stock_count: Number(wh.out_of_stock_count),
        low_stock_count: Number(wh.low_stock_count),
      })),
      stock_items: stockItems,
    }

    if (format === "csv") {
      const csvHeaders = [
        "SKU",
        "Item Name",
        "Category",
        "Warehouse",
        "Location",
        "Quantity",
        "Reserved",
        "Available",
        "Min Stock",
        "Max Stock",
        "Unit Cost",
        "Total Value",
        "Stock Status",
        "Supplier",
      ]

      const csvRows = stockItems.map((item) => [
        item.sku,
        item.name,
        item.category,
        item.warehouse_name,
        item.location_code,
        item.quantity,
        item.reserved_quantity,
        item.available_quantity,
        item.min_stock_level,
        item.max_stock_level,
        item.unit_cost,
        item.total_value,
        item.stock_status,
        item.supplier_name || "",
      ])

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(",")).join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=stock-levels-report.csv",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Error generating stock levels report:", error)
    return NextResponse.json({ error: "Failed to generate stock levels report" }, { status: 500 })
  }
}
