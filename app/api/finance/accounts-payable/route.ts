import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let dateFilter = sql``
    if (startDate && endDate) {
      dateFilter = sql`AND si.invoice_date >= ${startDate} AND si.invoice_date <= ${endDate}`
    }

    // Get outstanding supplier invoices
    const invoices = await sql`
      SELECT 
        si.*,
        s.company_name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        (si.total_amount - si.paid_amount) as outstanding_amount,
        CASE 
          WHEN si.due_date < CURRENT_DATE AND si.paid_amount < si.total_amount THEN 'overdue'
          WHEN si.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'current'
        END as aging_status
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
      ${dateFilter}
      ORDER BY si.due_date ASC
    `

    // Calculate totals
    const totalOutstanding = invoices.reduce((sum, inv) => sum + Number.parseFloat(inv.outstanding_amount || 0), 0)
    const totalOverdue = invoices
      .filter((inv) => inv.aging_status === "overdue")
      .reduce((sum, inv) => sum + Number.parseFloat(inv.outstanding_amount || 0), 0)
    const totalDueSoon = invoices
      .filter((inv) => inv.aging_status === "due_soon")
      .reduce((sum, inv) => sum + Number.parseFloat(inv.outstanding_amount || 0), 0)

    return NextResponse.json({
      success: true,
      summary: {
        total_outstanding: totalOutstanding,
        total_overdue: totalOverdue,
        total_due_soon: totalDueSoon,
        invoice_count: invoices.length,
      },
      invoices,
    })
  } catch (error) {
    console.error("Error fetching accounts payable:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accounts payable",
      },
      { status: 500 },
    )
  }
}
