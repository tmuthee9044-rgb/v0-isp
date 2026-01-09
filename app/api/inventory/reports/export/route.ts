import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportType, format, filters = {} } = body

    let reportData: any = {}
    let filename = `inventory-report-${Date.now()}`

    switch (reportType) {
      case "stock-levels":
        const stockQuery = `
          SELECT 
            ii.name,
            ii.sku,
            ii.category,
            ii.stock_quantity,
            ii.minimum_stock_level,
            ii.unit_cost,
            ii.location,
            ii.status,
            (ii.stock_quantity * ii.unit_cost) as total_value,
            CASE 
              WHEN ii.stock_quantity <= ii.minimum_stock_level THEN 'Low Stock'
              WHEN ii.stock_quantity = 0 THEN 'Out of Stock'
              ELSE 'In Stock'
            END as stock_status
          FROM inventory_items ii
          WHERE ii.status != 'retired'
          ORDER BY ii.category, ii.name
        `
        reportData = await sql(stockQuery)
        filename = `stock-levels-report-${Date.now()}`
        break

      case "supplier-performance":
        const supplierQuery = `
          SELECT 
            s.name as supplier_name,
            s.contact_person,
            s.email,
            s.phone,
            COUNT(po.id) as total_orders,
            COUNT(CASE WHEN po.status = 'delivered' THEN 1 END) as delivered_orders,
            COUNT(CASE WHEN po.status = 'cancelled' THEN 1 END) as cancelled_orders,
            SUM(po.total_amount) as total_order_value,
            AVG(EXTRACT(DAY FROM (po.delivered_date - po.order_date))) as avg_delivery_days,
            ROUND(
              COUNT(CASE WHEN po.status = 'delivered' THEN 1 END)::numeric / 
              NULLIF(COUNT(po.id), 0)::numeric * 100, 2
            ) as delivery_success_rate
          FROM suppliers s
          LEFT JOIN purchase_orders po ON s.id = po.supplier_id
          GROUP BY s.id, s.name, s.contact_person, s.email, s.phone
          ORDER BY delivery_success_rate DESC, total_order_value DESC
        `
        reportData = await sql(supplierQuery)
        filename = `supplier-performance-report-${Date.now()}`
        break

      case "movement-audit":
        const auditQuery = `
          SELECT 
            im.id,
            im.movement_type,
            im.quantity,
            im.reason,
            im.created_at,
            ii.name as item_name,
            ii.sku,
            ii.category,
            CASE 
              WHEN im.assigned_to_type = 'customer' THEN c.first_name || ' ' || c.last_name
              WHEN im.assigned_to_type = 'employee' THEN e.first_name || ' ' || e.last_name
              ELSE 'System'
            END as assigned_to,
            im.assigned_to_type,
            im.notes
          FROM inventory_movements im
          JOIN inventory_items ii ON im.item_id = ii.id
          LEFT JOIN customers c ON im.assigned_to_type = 'customer' AND im.assigned_to_id = c.id
          LEFT JOIN employees e ON im.assigned_to_type = 'employee' AND im.assigned_to_id = e.id
          ORDER BY im.created_at DESC
          LIMIT 1000
        `
        reportData = await sql(auditQuery)
        filename = `movement-audit-report-${Date.now()}`
        break

      default:
        throw new Error("Invalid report type")
    }

    if (format === "csv") {
      if (reportData.length === 0) {
        return NextResponse.json({ success: false, error: "No data available for export" }, { status: 400 })
      }

      // Convert to CSV format
      const headers = Object.keys(reportData[0]).join(",")
      const rows = reportData
        .map((row: any) =>
          Object.values(row)
            .map((value: any) => (typeof value === "string" && value.includes(",") ? `"${value}"` : value))
            .join(","),
        )
        .join("\n")

      const csvContent = `${headers}\n${rows}`

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // Return JSON for PDF generation or other formats
    return NextResponse.json({
      success: true,
      data: {
        reportType,
        format,
        filename,
        generatedAt: new Date().toISOString(),
        recordCount: reportData.length,
        data: reportData,
      },
    })
  } catch (error) {
    console.error("Error exporting inventory report:", error)
    return NextResponse.json({ success: false, error: "Failed to export report" }, { status: 500 })
  }
}
