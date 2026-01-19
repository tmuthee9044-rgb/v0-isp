import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'supplier_invoices'
      )
    `

    if (!tableExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        summary: {
          total_outstanding: 0,
          total_overdue: 0,
          total_due_soon: 0,
          invoice_count: 0,
        },
        invoices: [],
      })
    }

    let invoices
    if (startDate && endDate) {
      invoices = await sql`
        SELECT 
          si.id,
          si.supplier_id,
          si.invoice_number,
          si.invoice_date,
          si.due_date,
          si.total_amount,
          0 as paid_amount,
          si.status,
          COALESCE(s.company_name, 'Unknown') as supplier_name,
          s.email as supplier_email,
          s.phone as supplier_phone,
          si.total_amount as outstanding_amount,
          CASE 
            WHEN si.due_date < CURRENT_DATE THEN 'overdue'
            WHEN si.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
            ELSE 'current'
          END as aging_status
        FROM supplier_invoices si
        LEFT JOIN suppliers s ON si.supplier_id = s.id
        WHERE si.status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
          AND si.invoice_date >= ${startDate}::date
          AND si.invoice_date <= ${endDate}::date
        ORDER BY si.due_date ASC
      `
    } else {
      invoices = await sql`
        SELECT 
          si.id,
          si.supplier_id,
          si.invoice_number,
          si.invoice_date,
          si.due_date,
          si.total_amount,
          0 as paid_amount,
          si.status,
          COALESCE(s.company_name, 'Unknown') as supplier_name,
          s.email as supplier_email,
          s.phone as supplier_phone,
          si.total_amount as outstanding_amount,
          CASE 
            WHEN si.due_date < CURRENT_DATE THEN 'overdue'
            WHEN si.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
            ELSE 'current'
          END as aging_status
        FROM supplier_invoices si
        LEFT JOIN suppliers s ON si.supplier_id = s.id
        WHERE si.status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
        ORDER BY si.due_date ASC
      `
    }

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
