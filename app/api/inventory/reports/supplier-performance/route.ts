import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Supplier Performance Report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get("supplier_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const format = searchParams.get("format") || "json"

    let query = `
      SELECT 
        s.id,
        s.supplier_code,
        s.company_name,
        s.contact_person,
        s.email,
        s.phone,
        s.rating,
        s.payment_terms,
        COUNT(DISTINCT po.id) as total_orders,
        COUNT(DISTINCT CASE WHEN po.status = 'received' THEN po.id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN po.actual_delivery_date > po.expected_delivery_date THEN po.id END) as late_deliveries,
        COALESCE(SUM(po.total_amount), 0) as total_order_value,
        COALESCE(AVG(po.total_amount), 0) as avg_order_value,
        COALESCE(AVG(EXTRACT(DAYS FROM (po.actual_delivery_date - po.expected_delivery_date))), 0) as avg_delivery_delay_days,
        COUNT(DISTINCT si.id) as total_invoices,
        COALESCE(SUM(si.total_amount), 0) as total_invoice_value,
        COUNT(DISTINCT CASE WHEN si.status = 'paid' THEN si.id END) as paid_invoices,
        COUNT(DISTINCT CASE WHEN si.due_date < CURRENT_DATE AND si.status != 'paid' THEN si.id END) as overdue_invoices
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      LEFT JOIN supplier_invoices si ON s.id = si.supplier_id
      WHERE s.status = 'active'
    `

    const params = []
    let paramIndex = 1

    if (supplierId) {
      query += ` AND s.id = $${paramIndex}`
      params.push(supplierId)
      paramIndex++
    }

    if (startDate) {
      query += ` AND po.order_date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND po.order_date <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    query += `
      GROUP BY s.id, s.supplier_code, s.company_name, s.contact_person, s.email, s.phone, s.rating, s.payment_terms
      ORDER BY total_order_value DESC
    `

    const result = await sql.query(query, params)

    // Get detailed delivery performance
    const deliveryPerformance = await sql`
      SELECT 
        s.id as supplier_id,
        s.company_name,
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) as on_time_deliveries,
        COUNT(CASE WHEN po.actual_delivery_date > po.expected_delivery_date THEN 1 END) as late_deliveries,
        ROUND(
          (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::NUMERIC / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as on_time_percentage
      FROM suppliers s
      JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE po.actual_delivery_date IS NOT NULL
      ${supplierId ? `AND s.id = ${supplierId}` : ""}
      ${startDate ? `AND po.order_date >= '${startDate}'` : ""}
      ${endDate ? `AND po.order_date <= '${endDate}'` : ""}
      GROUP BY s.id, s.company_name
      ORDER BY on_time_percentage DESC
    `

    // Get quality metrics (based on goods receiving condition)
    const qualityMetrics = await sql`
      SELECT 
        s.id as supplier_id,
        s.company_name,
        COUNT(gri.id) as total_items_received,
        COUNT(CASE WHEN gri.condition_status = 'good' THEN 1 END) as good_condition_items,
        COUNT(CASE WHEN gri.condition_status = 'damaged' THEN 1 END) as damaged_items,
        COUNT(CASE WHEN gri.condition_status = 'defective' THEN 1 END) as defective_items,
        ROUND(
          (COUNT(CASE WHEN gri.condition_status = 'good' THEN 1 END)::NUMERIC / 
           NULLIF(COUNT(gri.id), 0)) * 100, 2
        ) as quality_percentage
      FROM suppliers s
      JOIN purchase_orders po ON s.id = po.supplier_id
      JOIN goods_receiving gr ON po.id = gr.purchase_order_id
      JOIN goods_receiving_items gri ON gr.id = gri.goods_receiving_id
      WHERE 1=1
      ${supplierId ? `AND s.id = ${supplierId}` : ""}
      ${startDate ? `AND gr.received_date >= '${startDate}'` : ""}
      ${endDate ? `AND gr.received_date <= '${endDate}'` : ""}
      GROUP BY s.id, s.company_name
      ORDER BY quality_percentage DESC
    `

    const suppliers = result.rows.map((supplier: any) => {
      const delivery = deliveryPerformance.find((d) => d.supplier_id === supplier.id)
      const quality = qualityMetrics.find((q) => q.supplier_id === supplier.id)

      return {
        id: supplier.id,
        supplier_code: supplier.supplier_code,
        company_name: supplier.company_name,
        contact_person: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        rating: supplier.rating,
        payment_terms: supplier.payment_terms,
        order_metrics: {
          total_orders: Number(supplier.total_orders),
          completed_orders: Number(supplier.completed_orders),
          completion_rate:
            supplier.total_orders > 0 ? Math.round((supplier.completed_orders / supplier.total_orders) * 100) : 0,
          total_order_value: Number(supplier.total_order_value),
          avg_order_value: Number(supplier.avg_order_value),
        },
        delivery_metrics: {
          total_deliveries: Number(delivery?.total_deliveries || 0),
          on_time_deliveries: Number(delivery?.on_time_deliveries || 0),
          late_deliveries: Number(delivery?.late_deliveries || 0),
          on_time_percentage: Number(delivery?.on_time_percentage || 0),
          avg_delay_days: Number(supplier.avg_delivery_delay_days),
        },
        quality_metrics: {
          total_items_received: Number(quality?.total_items_received || 0),
          good_condition_items: Number(quality?.good_condition_items || 0),
          damaged_items: Number(quality?.damaged_items || 0),
          defective_items: Number(quality?.defective_items || 0),
          quality_percentage: Number(quality?.quality_percentage || 0),
        },
        financial_metrics: {
          total_invoices: Number(supplier.total_invoices),
          total_invoice_value: Number(supplier.total_invoice_value),
          paid_invoices: Number(supplier.paid_invoices),
          overdue_invoices: Number(supplier.overdue_invoices),
          payment_compliance:
            supplier.total_invoices > 0 ? Math.round((supplier.paid_invoices / supplier.total_invoices) * 100) : 0,
        },
        overall_score: Math.round(
          (delivery?.on_time_percentage || 0) * 0.4 +
            (quality?.quality_percentage || 0) * 0.4 +
            (supplier.total_invoices > 0 ? (supplier.paid_invoices / supplier.total_invoices) * 100 : 0) * 0.2,
        ),
      }
    })

    const reportData = {
      report_title: "Supplier Performance Report",
      generated_at: new Date().toISOString(),
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_suppliers: suppliers.length,
        avg_on_time_percentage:
          suppliers.length > 0
            ? Math.round(
                suppliers.reduce((sum, s) => sum + s.delivery_metrics.on_time_percentage, 0) / suppliers.length,
              )
            : 0,
        avg_quality_percentage:
          suppliers.length > 0
            ? Math.round(suppliers.reduce((sum, s) => sum + s.quality_metrics.quality_percentage, 0) / suppliers.length)
            : 0,
        total_order_value: suppliers.reduce((sum, s) => sum + s.order_metrics.total_order_value, 0),
        best_performing_supplier:
          suppliers.length > 0
            ? suppliers.reduce((best, current) => (current.overall_score > best.overall_score ? current : best))
                .company_name
            : null,
      },
      suppliers,
    }

    if (format === "csv") {
      // Generate CSV format
      const csvHeaders = [
        "Supplier Code",
        "Company Name",
        "Contact Person",
        "Total Orders",
        "Completion Rate %",
        "On-Time Delivery %",
        "Quality %",
        "Payment Compliance %",
        "Overall Score",
      ]

      const csvRows = suppliers.map((s) => [
        s.supplier_code,
        s.company_name,
        s.contact_person,
        s.order_metrics.total_orders,
        s.order_metrics.completion_rate,
        s.delivery_metrics.on_time_percentage,
        s.quality_metrics.quality_percentage,
        s.financial_metrics.payment_compliance,
        s.overall_score,
      ])

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(",")).join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=supplier-performance-report.csv",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Error generating supplier performance report:", error)
    return NextResponse.json({ error: "Failed to generate supplier performance report" }, { status: 500 })
  }
}
