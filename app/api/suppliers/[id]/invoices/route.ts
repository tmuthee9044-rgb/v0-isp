import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplierId = params.id

    const invoices = await sql`
      SELECT 
        si.*,
        si.supplier_id::text as supplier_id_text,
        po.order_number as po_number,
        s.company_name as supplier_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sii.id,
              'description', sii.description,
              'quantity', sii.quantity,
              'unit_cost', sii.unit_cost,
              'total_amount', sii.total_amount,
              'inventory_item_id', sii.inventory_item_id
            ) ORDER BY sii.id
          ) FILTER (WHERE sii.id IS NOT NULL),
          '[]'
        ) as items
      FROM supplier_invoices si
      LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      LEFT JOIN supplier_invoice_items sii ON si.id = sii.invoice_id
      WHERE si.supplier_id::text = ${supplierId}
      GROUP BY si.id, po.order_number, s.company_name
      ORDER BY si.created_at DESC
    `

    const processedInvoices = invoices.map((invoice) => ({
      ...invoice,
      items: typeof invoice.items === "string" ? JSON.parse(invoice.items) : invoice.items || [],
    }))

    return NextResponse.json({
      success: true,
      invoices: processedInvoices,
    })
  } catch (error) {
    console.error("Error fetching supplier invoices:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch supplier invoices",
      },
      { status: 500 },
    )
  }
}
