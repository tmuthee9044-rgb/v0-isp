import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate =
      searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    const valuation = await sql`
      SELECT 
        ii.category,
        COUNT(*) as total_items,
        SUM(ii.stock_quantity) as total_quantity,
        SUM(ii.stock_quantity * ii.unit_cost) as total_value,
        AVG(ii.unit_cost) as avg_unit_cost,
        MIN(ii.unit_cost) as min_cost,
        MAX(ii.unit_cost) as max_cost
      FROM inventory_items ii
      WHERE ii.status != 'retired'
      GROUP BY ii.category
      ORDER BY total_value DESC
    `

    const inventoryAnalysis = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        ii.stock_quantity,
        ii.unit_cost,
        ii.stock_quantity * ii.unit_cost as total_value,
        CASE
          WHEN ii.stock_quantity = 0 THEN 'Out of Stock'
          WHEN ii.stock_quantity < 5 THEN 'Low Stock'
          WHEN ii.stock_quantity > 100 THEN 'Overstock'
          ELSE 'Normal'
        END as stock_status
      FROM inventory_items ii
      WHERE ii.status != 'retired'
      ORDER BY total_value DESC
    `

    const totalValue = valuation.reduce((sum: number, item: any) => sum + Number.parseFloat(item.total_value || "0"), 0)
    let cumulativeValue = 0
    const abcAnalysis = valuation.map((item: any) => {
      const itemValue = Number.parseFloat(item.total_value || "0")
      const percentage = totalValue > 0 ? (itemValue / totalValue) * 100 : 0
      cumulativeValue += percentage

      let classification = "C"
      if (cumulativeValue <= 80) classification = "A"
      else if (cumulativeValue <= 95) classification = "B"

      return {
        ...item,
        value_percentage: Math.round(percentage * 100) / 100,
        cumulative_percentage: Math.round(cumulativeValue * 100) / 100,
        abc_classification: classification,
      }
    })

    const turnover = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        ii.stock_quantity,
        ii.unit_cost,
        COALESCE(movements.items_issued, 0) as items_issued,
        CASE 
          WHEN ii.stock_quantity > 0 AND COALESCE(movements.items_issued, 0) > 0 
          THEN ROUND((COALESCE(movements.items_issued, 0)::numeric / ii.stock_quantity::numeric), 2)
          ELSE 0 
        END as turnover_ratio,
        CASE
          WHEN ii.stock_quantity > 0 AND COALESCE(movements.items_issued, 0) > 0 THEN
            CASE 
              WHEN (COALESCE(movements.items_issued, 0)::numeric / ii.stock_quantity::numeric) >= 2.0 THEN 'Fast Moving'
              WHEN (COALESCE(movements.items_issued, 0)::numeric / ii.stock_quantity::numeric) >= 0.5 THEN 'Medium Moving'
              ELSE 'Slow Moving'
            END
          ELSE 'No Movement'
        END as movement_category
      FROM inventory_items ii
      LEFT JOIN (
        SELECT 
          item_id,
          SUM(CASE WHEN movement_type IN ('out', 'transfer_out', 'adjustment_out') THEN quantity ELSE 0 END) as items_issued
        FROM inventory_movements 
        WHERE created_at >= ${startDate}::date AND created_at <= ${endDate}::date
        GROUP BY item_id
      ) movements ON ii.id = movements.item_id
      WHERE ii.status != 'retired'
      ORDER BY turnover_ratio DESC, items_issued DESC
    `.catch(() => [])

    const supplierCosts = await sql`
      SELECT 
        s.company_name as supplier_name,
        COUNT(DISTINCT ii.id) as items_supplied,
        SUM(ii.stock_quantity * ii.unit_cost) as total_inventory_value,
        AVG(ii.unit_cost) as avg_item_cost,
        COALESCE(po_data.total_purchase_value, 0) as total_purchase_value,
        COALESCE(po_data.total_orders, 0) as total_orders
      FROM suppliers s
      LEFT JOIN inventory_items ii ON ii.supplier_id = s.id
      LEFT JOIN (
        SELECT 
          supplier_id,
          SUM(total_amount) as total_purchase_value,
          COUNT(*) as total_orders
        FROM purchase_orders 
        WHERE created_at >= ${startDate}::date AND created_at <= ${endDate}::date
        GROUP BY supplier_id
      ) po_data ON s.id = po_data.supplier_id
      WHERE s.is_active = true
      GROUP BY s.id, s.company_name, po_data.total_purchase_value, po_data.total_orders
      HAVING COUNT(DISTINCT ii.id) > 0 OR COALESCE(po_data.total_orders, 0) > 0
      ORDER BY total_inventory_value DESC
    `.catch(() => [])

    return NextResponse.json({
      success: true,
      data: {
        valuation: valuation.map((item: any) => ({
          ...item,
          total_value: Number.parseFloat(item.total_value || "0"),
          avg_unit_cost: Number.parseFloat(item.avg_unit_cost || "0"),
          min_cost: Number.parseFloat(item.min_cost || "0"),
          max_cost: Number.parseFloat(item.max_cost || "0"),
        })),
        inventoryAnalysis: inventoryAnalysis.map((item: any) => ({
          ...item,
          unit_cost: Number.parseFloat(item.unit_cost || "0"),
          total_value: Number.parseFloat(item.total_value || "0"),
        })),
        abcAnalysis,
        turnover: Array.isArray(turnover)
          ? turnover.map((item: any) => ({
              ...item,
              unit_cost: Number.parseFloat(item.unit_cost || "0"),
              turnover_ratio: Number.parseFloat(item.turnover_ratio || "0"),
              items_issued: Number.parseInt(item.items_issued || "0"),
            }))
          : [],
        supplierCosts: Array.isArray(supplierCosts)
          ? supplierCosts.map((item: any) => ({
              ...item,
              total_inventory_value: Number.parseFloat(item.total_inventory_value || "0"),
              avg_item_cost: Number.parseFloat(item.avg_item_cost || "0"),
              total_purchase_value: Number.parseFloat(item.total_purchase_value || "0"),
              items_supplied: Number.parseInt(item.items_supplied || "0"),
              total_orders: Number.parseInt(item.total_orders || "0"),
            }))
          : [],
        summary: {
          total_inventory_value: totalValue,
          total_categories: valuation.length,
          total_items: inventoryAnalysis.length,
          date_range: { startDate, endDate },
        },
      },
    })
  } catch (error) {
    console.error("Error generating financial inventory report:", error)
    return NextResponse.json({ success: false, error: "Failed to generate financial report" }, { status: 500 })
  }
}
