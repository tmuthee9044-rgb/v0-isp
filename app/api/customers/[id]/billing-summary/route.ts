import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    // Get customer basic info
    const customer = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        preferred_contact_method
      FROM customers 
      WHERE id = ${customerId}
    `

    if (customer.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    // Calculate total paid
    const totalPaidResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments 
      WHERE customer_id = ${customerId} AND status = 'completed'
    `

    // Calculate total invoiced
    const totalInvoicedResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_invoiced
      FROM invoices 
      WHERE customer_id = ${customerId}
    `

    const totalCreditNotesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_credit_notes
      FROM credit_notes 
      WHERE customer_id = ${customerId} AND status = 'approved'
    `

    // Calculate total outstanding (pending + overdue invoices)
    const totalOutstandingResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_outstanding
      FROM invoices 
      WHERE customer_id = ${customerId} AND status IN ('pending', 'overdue')
    `

    // Get last payment date
    const lastPaymentResult = await sql`
      SELECT payment_date
      FROM payments 
      WHERE customer_id = ${customerId} AND status = 'completed'
      ORDER BY payment_date DESC
      LIMIT 1
    `

    // Get contract end date from active services
    const contractResult = await sql`
      SELECT end_date
      FROM customer_services
      WHERE customer_id = ${customerId} AND status = 'active'
      ORDER BY end_date DESC
      LIMIT 1
    `

    const totalInvoiced = Number(totalInvoicedResult[0]?.total_invoiced || 0)
    const totalPaid = Number(totalPaidResult[0]?.total_paid || 0)
    const totalCreditNotes = Number(totalCreditNotesResult[0]?.total_credit_notes || 0)
    // Negative balance = customer owes money, Positive = customer has credit
    const balance = totalPaid + totalCreditNotes - totalInvoiced

    const summary = {
      balance: balance,
      expiry_date: contractResult[0]?.end_date || null,
      payment_method: customer[0].preferred_contact_method || "Unknown",
      total_paid: totalPaid,
      total_outstanding: Number(totalOutstandingResult[0]?.total_outstanding || 0),
      last_payment_date: lastPaymentResult[0]?.payment_date || null,
    }

    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error("Error fetching billing summary:", error)
    return NextResponse.json(
      { success: false, error: String(error) || "Failed to fetch billing summary" },
      { status: 500 },
    )
  }
}
