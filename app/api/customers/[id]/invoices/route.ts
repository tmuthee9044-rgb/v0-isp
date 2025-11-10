import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    // Query invoices for the customer
    const invoices = await sql`
      SELECT 
        i.id,
        i.invoice_number,
        'invoice' as type,
        i.created_at as date,
        i.amount as total_amount,
        i.due_date,
        NULL as payment_date,
        i.status
      FROM invoices i
      WHERE i.customer_id = ${customerId}
      ORDER BY i.created_at DESC
    `

    // Query payments for the customer
    const payments = await sql`
      SELECT 
        p.id,
        p.transaction_id as invoice_number,
        'payment' as type,
        p.payment_date as date,
        p.amount as total_amount,
        NULL as due_date,
        p.payment_date,
        p.status
      FROM payments p
      WHERE p.customer_id = ${customerId}
      ORDER BY p.payment_date DESC
    `

    // Combine and sort all documents
    const allDocuments = [...invoices, ...payments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return NextResponse.json({
      success: true,
      invoices: allDocuments,
    })
  } catch (error) {
    console.error("Error fetching customer invoices:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch invoices" }, { status: 500 })
  }
}
