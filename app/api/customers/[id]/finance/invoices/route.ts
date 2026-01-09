import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    const invoices = await sql`
      SELECT 
        i.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ii.id,
              'description', ii.description,
              'quantity', ii.quantity,
              'unit_price', ii.unit_price,
              'total_amount', ii.total_amount,
              'service_plan_name', sp.name
            )
          ) FILTER (WHERE ii.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN service_plans sp ON ii.service_plan_id = sp.id
      WHERE i.customer_id = ${customerId}
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
    })
  } catch (error) {
    console.error("Error fetching customer invoices:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch invoices" }, { status: 500 })
  }
}
