import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Get stock alerts and low inventory warnings
export async function GET() {
  try {
    // Get low stock items
    const lowStockItems = await sql`
      SELECT 
        id,
        name,
        category,
        sku,
        stock_quantity,
        min_stock_level,
        unit_cost,
        location,
        (min_stock_level - stock_quantity) as shortage_quantity,
        (min_stock_level - stock_quantity) * unit_cost as shortage_value
      FROM inventory_items
      WHERE stock_quantity <= min_stock_level
      AND status = 'active'
      ORDER BY (stock_quantity / NULLIF(min_stock_level, 0)) ASC
    `

    // Get out of stock items
    const outOfStockItems = await sql`
      SELECT 
        id,
        name,
        category,
        sku,
        min_stock_level,
        unit_cost,
        location,
        min_stock_level * unit_cost as reorder_value
      FROM inventory_items
      WHERE stock_quantity = 0
      AND status = 'active'
      ORDER BY category, name
    `

    // Get items with high demand (frequently allocated)
    const highDemandItems = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.category,
        ii.stock_quantity,
        ii.min_stock_level,
        COUNT(im.id) as allocation_count,
        SUM(im.quantity) as total_allocated
      FROM inventory_items ii
      JOIN inventory_movements im ON ii.id = im.inventory_item_id
      WHERE im.movement_type = 'out'
      AND im.created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND ii.status = 'active'
      GROUP BY ii.id, ii.name, ii.category, ii.stock_quantity, ii.min_stock_level
      HAVING COUNT(im.id) >= 5
      ORDER BY total_allocated DESC
      LIMIT 10
    `

    // Get equipment due for maintenance/replacement
    const maintenanceDueItems = await sql`
      SELECT 
        ce.id,
        ce.equipment_name,
        ce.equipment_type,
        ce.issued_date,
        ce.status,
        c.first_name,
        c.last_name,
        c.email,
        EXTRACT(DAYS FROM (CURRENT_DATE - ce.issued_date)) as days_in_use
      FROM customer_equipment ce
      JOIN customers c ON ce.customer_id = c.id
      WHERE ce.status = 'issued'
      AND ce.issued_date <= CURRENT_DATE - INTERVAL '2 years'
      ORDER BY ce.issued_date ASC
      LIMIT 20
    `

    // Calculate summary statistics
    const totalLowStockValue = lowStockItems.reduce((sum, item) => sum + Number(item.shortage_value || 0), 0)
    const totalReorderValue = outOfStockItems.reduce((sum, item) => sum + Number(item.reorder_value || 0), 0)

    const alerts = {
      low_stock: {
        count: lowStockItems.length,
        items: lowStockItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          sku: item.sku,
          current_stock: Number(item.stock_quantity),
          min_stock: Number(item.min_stock_level),
          shortage: Number(item.shortage_quantity),
          unit_cost: Number(item.unit_cost),
          shortage_value: Number(item.shortage_value),
          location: item.location,
          urgency:
            item.stock_quantity === 0
              ? "critical"
              : item.stock_quantity <= item.min_stock_level / 2
                ? "high"
                : "medium",
        })),
        total_shortage_value: totalLowStockValue,
      },
      out_of_stock: {
        count: outOfStockItems.length,
        items: outOfStockItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          sku: item.sku,
          min_stock: Number(item.min_stock_level),
          unit_cost: Number(item.unit_cost),
          reorder_value: Number(item.reorder_value),
          location: item.location,
        })),
        total_reorder_value: totalReorderValue,
      },
      high_demand: {
        count: highDemandItems.length,
        items: highDemandItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          current_stock: Number(item.stock_quantity),
          min_stock: Number(item.min_stock_level),
          allocation_count: Number(item.allocation_count),
          total_allocated: Number(item.total_allocated),
          recommendation: Number(item.stock_quantity) <= Number(item.min_stock_level) ? "increase_stock" : "monitor",
        })),
      },
      maintenance_due: {
        count: maintenanceDueItems.length,
        items: maintenanceDueItems.map((item) => ({
          id: item.id,
          equipment_name: item.equipment_name,
          equipment_type: item.equipment_type,
          customer: `${item.first_name} ${item.last_name}`,
          customer_email: item.email,
          issued_date: item.issued_date,
          days_in_use: Number(item.days_in_use),
          status: item.status,
          action_needed: Number(item.days_in_use) >= 1095 ? "replace" : "inspect", // 3 years
        })),
      },
    }

    return NextResponse.json({
      success: true,
      alerts,
      summary: {
        total_alerts: alerts.low_stock.count + alerts.out_of_stock.count + alerts.maintenance_due.count,
        critical_items: alerts.out_of_stock.count,
        total_financial_impact: totalLowStockValue + totalReorderValue,
      },
    })
  } catch (error) {
    console.error("Stock alerts fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock alerts",
      },
      { status: 500 },
    )
  }
}

// Create or update stock alert thresholds
export async function POST(request: Request) {
  try {
    const { item_id, min_stock_level, max_stock_level, alert_threshold } = await request.json()

    if (!item_id || min_stock_level === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Item ID and minimum stock level are required",
        },
        { status: 400 },
      )
    }

    await sql`
      UPDATE inventory_items 
      SET 
        min_stock_level = ${min_stock_level},
        max_stock_level = ${max_stock_level || null},
        updated_at = NOW()
      WHERE id = ${item_id}
    `

    // Log the threshold update
    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details
      )
      VALUES (
        'INFO', 'Inventory Management', 'stock_threshold',
        'Stock alert thresholds updated',
        ${JSON.stringify({ item_id, min_stock_level, max_stock_level, alert_threshold })}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Stock alert thresholds updated successfully",
    })
  } catch (error) {
    console.error("Stock threshold update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update stock thresholds",
      },
      { status: 500 },
    )
  }
}
