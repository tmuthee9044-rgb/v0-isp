import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Get unpaid/partially paid invoices ordered by oldest first (FIFO)
    const invoices = await sql`
      SELECT 
        id,
        invoice_number,
        amount,
        COALESCE(paid_amount, 0) as paid_amount,
        (amount - COALESCE(paid_amount, 0)) as balance_due,
        status,
        due_date,
        created_at,
        description
      FROM invoices 
      WHERE customer_id = ${customerId} 
      AND status IN ('pending', 'overdue', 'partial')
      AND (amount - COALESCE(paid_amount, 0)) > 0
      ORDER BY due_date ASC, created_at ASC
    `

    return NextResponse.json({
      success: true,
      invoices: invoices.map((inv) => ({
        ...inv,
        amount: Number.parseFloat(inv.amount),
        paid_amount: Number.parseFloat(inv.paid_amount),
        balance_due: Number.parseFloat(inv.balance_due),
      })),
    })
  } catch (error) {
    console.error("Error fetching unpaid invoices:", error)
    return NextResponse.json({ error: "Failed to fetch unpaid invoices" }, { status: 500 })
  }
}
