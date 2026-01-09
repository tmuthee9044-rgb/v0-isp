import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get real-time inventory alerts
export async function GET() {
  try {
    // Low stock alerts
    const lowStockAlerts = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        il.quantity,
        il.min_stock_level,
        il.reserved_quantity,
        w.name as warehouse_name,
        (il.quantity - il.reserved_quantity) as available_quantity,
        ii.unit_cost,
        (il.min_stock_level - (il.quantity - il.reserved_quantity)) as shortage_quantity
      FROM inventory_items ii
      JOIN inventory_locations il ON ii.id = il.inventory_item_id
      JOIN warehouses w ON il.warehouse_id = w.id
      WHERE (il.quantity - il.reserved_quantity) <= il.min_stock_level
      AND il.min_stock_level > 0
      AND ii.is_active = true
      ORDER BY (il.quantity - il.reserved_quantity) ASC
    `

    // Overstock alerts
    const overstockAlerts = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        il.quantity,
        il.max_stock_level,
        w.name as warehouse_name,
        ii.unit_cost,
        (il.quantity - il.max_stock_level) as excess_quantity,
        (il.quantity - il.max_stock_level) * ii.unit_cost as excess_value
      FROM inventory_items ii
      JOIN inventory_locations il ON ii.id = il.inventory_item_id
      JOIN warehouses w ON il.warehouse_id = w.id
      WHERE il.quantity > il.max_stock_level
      AND il.max_stock_level > 0
      AND ii.is_active = true
      ORDER BY excess_value DESC
    `

    // Expired reservations
    const expiredReservations = await sql`
      SELECT 
        sr.id,
        ii.name as item_name,
        ii.sku,
        sr.reserved_quantity,
        sr.reservation_type,
        sr.reserved_until,
        w.name as warehouse_name,
        c.first_name,
        c.last_name
      FROM stock_reservations sr
      JOIN inventory_items ii ON sr.inventory_item_id = ii.id
      JOIN warehouses w ON sr.warehouse_id = w.id
      LEFT JOIN customers c ON sr.reference_id = c.id AND sr.reservation_type = 'customer_order'
      WHERE sr.status = 'active'
      AND sr.reserved_until < NOW()
      ORDER BY sr.reserved_until ASC
    `

    // Items requiring maintenance
    const maintenanceAlerts = await sql`
      SELECT 
        isn.id,
        isn.serial_number,
        ii.name as item_name,
        ii.sku,
        isn.next_maintenance_date,
        isn.status,
        ce.customer_id,
        c.first_name,
        c.last_name
      FROM inventory_serial_numbers isn
      JOIN inventory_items ii ON isn.inventory_item_id = ii.id
      LEFT JOIN customer_equipment ce ON isn.serial_number = ce.serial_number
      LEFT JOIN customers c ON ce.customer_id = c.id
      WHERE isn.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'
      AND isn.status IN ('issued', 'maintenance')
      ORDER BY isn.next_maintenance_date ASC
    `

    // Slow-moving inventory (no movement in 90 days)
    const slowMovingItems = await sql`
      SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.category,
        SUM(il.quantity) as total_quantity,
        ii.unit_cost,
        SUM(il.quantity) * ii.unit_cost as total_value,
        MAX(im.created_at) as last_movement_date
      FROM inventory_items ii
      JOIN inventory_locations il ON ii.id = il.inventory_item_id
      LEFT JOIN inventory_movements im ON ii.id = im.inventory_item_id
      WHERE ii.is_active = true
      GROUP BY ii.id, ii.name, ii.sku, ii.category, ii.unit_cost
      HAVING (MAX(im.created_at) < CURRENT_DATE - INTERVAL '90 days' OR MAX(im.created_at) IS NULL)
      AND SUM(il.quantity) > 0
      ORDER BY total_value DESC
      LIMIT 20
    `

    // Calculate summary statistics
    const totalLowStockValue = lowStockAlerts.reduce(
      (sum, item) => sum + Number(item.shortage_quantity) * Number(item.unit_cost),
      0,
    )

    const totalOverstockValue = overstockAlerts.reduce((sum, item) => sum + Number(item.excess_value), 0)

    const totalSlowMovingValue = slowMovingItems.reduce((sum, item) => sum + Number(item.total_value), 0)

    return NextResponse.json({
      success: true,
      alerts: {
        low_stock: {
          count: lowStockAlerts.length,
          total_shortage_value: totalLowStockValue,
          items: lowStockAlerts.map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            current_quantity: Number(item.quantity),
            available_quantity: Number(item.available_quantity),
            min_stock_level: Number(item.min_stock_level),
            shortage_quantity: Number(item.shortage_quantity),
            warehouse_name: item.warehouse_name,
            unit_cost: Number(item.unit_cost),
            urgency:
              item.available_quantity <= 0
                ? "critical"
                : item.available_quantity <= item.min_stock_level / 2
                  ? "high"
                  : "medium",
          })),
        },
        overstock: {
          count: overstockAlerts.length,
          total_excess_value: totalOverstockValue,
          items: overstockAlerts.map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            current_quantity: Number(item.quantity),
            max_stock_level: Number(item.max_stock_level),
            excess_quantity: Number(item.excess_quantity),
            excess_value: Number(item.excess_value),
            warehouse_name: item.warehouse_name,
            unit_cost: Number(item.unit_cost),
          })),
        },
        expired_reservations: {
          count: expiredReservations.length,
          items: expiredReservations.map((res: any) => ({
            id: res.id,
            item_name: res.item_name,
            sku: res.sku,
            reserved_quantity: Number(res.reserved_quantity),
            reservation_type: res.reservation_type,
            reserved_until: res.reserved_until,
            warehouse_name: res.warehouse_name,
            customer_name: res.first_name && res.last_name ? `${res.first_name} ${res.last_name}` : null,
            days_overdue: Math.floor(
              (new Date().getTime() - new Date(res.reserved_until).getTime()) / (1000 * 60 * 60 * 24),
            ),
          })),
        },
        maintenance_due: {
          count: maintenanceAlerts.length,
          items: maintenanceAlerts.map((item: any) => ({
            id: item.id,
            serial_number: item.serial_number,
            item_name: item.item_name,
            sku: item.sku,
            next_maintenance_date: item.next_maintenance_date,
            status: item.status,
            customer_name: item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : null,
            days_until_due: Math.floor(
              (new Date(item.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
            ),
          })),
        },
        slow_moving: {
          count: slowMovingItems.length,
          total_value: totalSlowMovingValue,
          items: slowMovingItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            total_quantity: Number(item.total_quantity),
            unit_cost: Number(item.unit_cost),
            total_value: Number(item.total_value),
            last_movement_date: item.last_movement_date,
            days_since_movement: item.last_movement_date
              ? Math.floor((new Date().getTime() - new Date(item.last_movement_date).getTime()) / (1000 * 60 * 60 * 24))
              : null,
          })),
        },
      },
      summary: {
        total_alerts:
          lowStockAlerts.length + overstockAlerts.length + expiredReservations.length + maintenanceAlerts.length,
        critical_alerts: lowStockAlerts.filter((item) => item.available_quantity <= 0).length,
        total_financial_impact: totalLowStockValue + totalOverstockValue + totalSlowMovingValue,
      },
    })
  } catch (error) {
    console.error("Error fetching inventory alerts:", error)
    return NextResponse.json({ error: "Failed to fetch inventory alerts" }, { status: 500 })
  }
}
