import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const { id: supplierId, invoiceId } = params
    const data = await request.json()

    const { due_date, notes, status } = data

    const [updatedInvoice] = await sql`
      UPDATE supplier_invoices
      SET 
        due_date = COALESCE(${due_date}, due_date),
        notes = COALESCE(${notes}, notes),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${invoiceId} AND supplier_id = ${supplierId}
      RETURNING *
    `

    if (!updatedInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Log the update
    await sql`
      INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        ip_address,
        created_at
      ) VALUES (
        'supplier_invoice_updated',
        'supplier_invoice',
        ${invoiceId},
        ${JSON.stringify({ due_date, notes, status })},
        'system',
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error("[v0] Error updating invoice:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const { id: supplierId, invoiceId } = params

    // Check if invoice has payments
    const [invoice] = await sql`
      SELECT paid_amount FROM supplier_invoices
      WHERE id = ${invoiceId} AND supplier_id = ${supplierId}
    `

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (Number(invoice.paid_amount) > 0) {
      return NextResponse.json(
        { error: "Cannot delete invoice with payments. Please remove payments first." },
        { status: 400 },
      )
    }

    // Delete invoice items first
    await sql`
      DELETE FROM supplier_invoice_items
      WHERE invoice_id = ${invoiceId}
    `

    await sql`
      DELETE FROM supplier_invoices
      WHERE id = ${invoiceId} AND supplier_id = ${supplierId}
    `

    // Log the deletion
    await sql`
      INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        ip_address,
        created_at
      ) VALUES (
        'supplier_invoice_deleted',
        'supplier_invoice',
        ${invoiceId},
        ${JSON.stringify({ supplier_id: supplierId })},
        'system',
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting invoice:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete invoice" },
      { status: 500 },
    )
  }
}
