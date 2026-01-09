import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    console.log("[v0] Fetching credit notes for customer:", customerId)

    const creditNotes = await sql`
      SELECT 
        cn.*,
        u.username as created_by_name,
        i.invoice_number,
        COALESCE(SUM(ca.amount_applied), 0) as amount_applied,
        (cn.amount - COALESCE(SUM(ca.amount_applied), 0)) as remaining_balance
      FROM credit_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      LEFT JOIN credit_applications ca ON cn.id = ca.adjustment_id
      WHERE cn.customer_id = ${customerId}
      GROUP BY cn.id, u.username, i.invoice_number
      ORDER BY cn.created_at DESC
    `

    console.log("[v0] Found credit notes:", creditNotes.length)

    return NextResponse.json({
      success: true,
      creditNotes: creditNotes || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching credit notes:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch credit notes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const {
      credit_type,
      amount,
      reason,
      reference_number,
      invoice_id,
      auto_apply = true,
      refund_method,
    } = await request.json()

    console.log("[v0] Creating credit note for customer:", customerId)
    console.log("[v0] Credit note data:", {
      credit_type,
      amount,
      reason,
      reference_number,
      invoice_id,
      auto_apply,
      refund_method,
    })

    if (!amount || amount <= 0) {
      console.log("[v0] Invalid amount:", amount)
      return NextResponse.json({ success: false, error: "Amount must be greater than 0" }, { status: 400 })
    }

    if (!reason || reason.trim() === "") {
      console.log("[v0] Missing reason")
      return NextResponse.json({ success: false, error: "Reason is required" }, { status: 400 })
    }

    const creditNoteNumber = `CN-${customerId}-${Date.now()}`
    console.log("[v0] Generated credit note number:", creditNoteNumber)

    const creditNote = await sql`
      INSERT INTO credit_notes (
        customer_id, credit_note_number, amount, reason, status, 
        invoice_id, created_by, created_at, notes
      )
      VALUES (
        ${customerId}, 
        ${creditNoteNumber}, 
        ${amount}, 
        ${reason}, 
        'approved',
        ${invoice_id || null}, 
        1, 
        NOW(),
        ${JSON.stringify({ credit_type, refund_method, auto_apply, reference_number })}
      )
      RETURNING *
    `

    console.log("[v0] Credit note created:", creditNote[0])

    if (auto_apply) {
      console.log("[v0] Auto-applying credit to invoices...")
      await applyCreditToInvoices(customerId, amount, creditNote[0].id)
    }

    if (refund_method && credit_type === "refund") {
      console.log("[v0] Processing refund...")
      await processRefund(customerId, amount, refund_method, creditNote[0].id)
    }

    console.log("[v0] Credit note creation completed successfully")

    return NextResponse.json({
      success: true,
      creditNote: creditNote[0],
    })
  } catch (error) {
    console.error("[v0] Error creating credit note:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create credit note",
      },
      { status: 500 },
    )
  }
}

async function processRefund(customerId: number, amount: number, method: string, creditNoteId: number) {
  try {
    console.log("[v0] Creating refund record...")
    // Create refund record
    await sql`
      INSERT INTO refunds (
        customer_id, adjustment_id, amount, refund_method, status, created_at
      )
      VALUES (${customerId}, ${creditNoteId}, ${amount}, ${method}, 'pending', NOW())
    `

    console.log("[v0] Refund record created successfully")
  } catch (error) {
    console.error("[v0] Error processing refund:", error)
    throw error
  }
}

async function applyCreditToInvoices(customerId: number, creditAmount: number, creditNoteId: number) {
  try {
    console.log("[v0] Fetching open invoices for customer:", customerId)

    const openInvoices = await sql`
      SELECT * FROM invoices 
      WHERE customer_id = ${customerId} 
      AND status IN ('pending', 'overdue', 'partial') 
      ORDER BY due_date ASC
    `

    console.log("[v0] Found open invoices:", openInvoices.length)

    let remainingCredit = creditAmount

    for (const invoice of openInvoices) {
      if (remainingCredit <= 0) break

      const invoiceBalance = Number(invoice.amount) - (Number(invoice.paid_amount) || 0)
      const applicationAmount = Math.min(remainingCredit, invoiceBalance)

      console.log("[v0] Applying credit to invoice:", invoice.id, "Amount:", applicationAmount)

      await sql`
        INSERT INTO credit_applications (
          customer_id, invoice_id, adjustment_id, amount_applied, created_at
        )
        VALUES (${customerId}, ${invoice.id}, ${creditNoteId}, ${applicationAmount}, NOW())
      `

      const newPaidAmount = (Number(invoice.paid_amount) || 0) + applicationAmount
      const newStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partial"

      await sql`
        UPDATE invoices 
        SET paid_amount = ${newPaidAmount}, status = ${newStatus}
        WHERE id = ${invoice.id}
      `

      console.log("[v0] Invoice updated:", invoice.id, "New status:", newStatus)

      remainingCredit -= applicationAmount
    }

    console.log("[v0] Credit application completed. Remaining credit:", remainingCredit)
  } catch (error) {
    console.error("[v0] Error applying credit to invoices:", error)
    throw error
  }
}
