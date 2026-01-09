import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const adjustments = await sql`
      SELECT 
        fa.*,
        u.username as created_by_name
      FROM financial_adjustments fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE fa.customer_id = ${customerId}
      ORDER BY fa.created_at DESC
    `

    return NextResponse.json({
      success: true,
      adjustments: adjustments || [],
    })
  } catch (error) {
    console.error("Error fetching customer adjustments:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch adjustments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { adjustment_type, amount, reason, reference_number, invoice_id, auto_apply } = await request.json()

    const adjustment = await sql`
      INSERT INTO financial_adjustments (
        customer_id, adjustment_type, amount, reason, reference_number, 
        invoice_id, status, created_by, created_at
      )
      VALUES (
        ${customerId}, ${adjustment_type}, ${amount}, ${reason}, ${reference_number},
        ${invoice_id || null}, 'approved', 1, NOW()
      )
      RETURNING *
    `

    if (auto_apply && adjustment_type === "credit" && amount > 0) {
      await applyCreditToInvoices(customerId, amount, adjustment[0].id)
    }

    await updateCustomerBalance(customerId)

    return NextResponse.json({
      success: true,
      adjustment: adjustment[0],
    })
  } catch (error) {
    console.error("Error creating financial adjustment:", error)
    return NextResponse.json({ success: false, error: "Failed to create adjustment" }, { status: 500 })
  }
}

async function applyCreditToInvoices(customerId: number, creditAmount: number, adjustmentId: number) {
  // Get open invoices ordered by due date (FIFO)
  const openInvoices = await sql`
    SELECT * FROM invoices 
    WHERE customer_id = ${customerId} 
    AND status IN ('pending', 'overdue', 'partial') 
    ORDER BY due_date ASC
  `

  let remainingCredit = creditAmount

  for (const invoice of openInvoices) {
    if (remainingCredit <= 0) break

    const invoiceBalance = invoice.amount - (invoice.paid_amount || 0)
    const applicationAmount = Math.min(remainingCredit, invoiceBalance)

    // Create credit application record
    await sql`
      INSERT INTO credit_applications (
        customer_id, invoice_id, adjustment_id, amount_applied, created_at
      )
      VALUES (${customerId}, ${invoice.id}, ${adjustmentId}, ${applicationAmount}, NOW())
    `

    // Update invoice paid amount and status
    const newPaidAmount = (invoice.paid_amount || 0) + applicationAmount
    const newStatus = newPaidAmount >= invoice.amount ? "paid" : "partial"

    await sql`
      UPDATE invoices 
      SET paid_amount = ${newPaidAmount}, status = ${newStatus}, updated_at = NOW()
      WHERE id = ${invoice.id}
    `

    remainingCredit -= applicationAmount
  }
}

async function updateCustomerBalance(customerId: number) {
  const balanceResult = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_payments,
      COALESCE(SUM(CASE WHEN i.status != 'cancelled' THEN i.amount ELSE 0 END), 0) as total_invoices,
      COALESCE(SUM(CASE WHEN fa.adjustment_type = 'credit' THEN fa.amount ELSE -fa.amount END), 0) as total_adjustments
    FROM customers c
    LEFT JOIN payments p ON c.id = p.customer_id
    LEFT JOIN invoices i ON c.id = i.customer_id  
    LEFT JOIN financial_adjustments fa ON c.id = fa.customer_id
    WHERE c.id = ${customerId}
    GROUP BY c.id
  `

  if (balanceResult.length > 0) {
    const balance =
      balanceResult[0].total_payments + balanceResult[0].total_adjustments - balanceResult[0].total_invoices

    await sql`
      INSERT INTO account_balances (customer_id, balance, last_updated)
      VALUES (${customerId}, ${balance}, NOW())
      ON CONFLICT (customer_id) 
      DO UPDATE SET balance = ${balance}, last_updated = NOW()
    `
  }
}
