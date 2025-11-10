import { type NextRequest, NextResponse } from "next/server"
import { getSqlConnection } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  try {
    const customerId = params.id
    const documentId = params.documentId
    const { document_type } = await request.json()

    const sql = getSqlConnection()

    let documentDetails
    let deleteResult

    switch (document_type) {
      case "payment":
        // Get payment details before deletion
        documentDetails = await sql`
          SELECT * FROM payments
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        if (documentDetails.length === 0) {
          return NextResponse.json({ error: "Payment not found" }, { status: 404 })
        }

        // Delete the payment
        deleteResult = await sql`
          DELETE FROM payments
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        // Log the deletion
        await sql`
          INSERT INTO admin_logs (
            action,
            resource_type,
            resource_id,
            old_values,
            admin_id,
            created_at
          ) VALUES (
            'payment_deleted',
            'payment',
            ${documentId},
            ${JSON.stringify({
              customer_id: customerId,
              document_type,
              document_details: documentDetails[0],
            })},
            1,
            NOW()
          )
        `
        break

      case "credit_note":
        // Get credit note details before deletion
        documentDetails = await sql`
          SELECT * FROM credit_notes
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        if (documentDetails.length === 0) {
          return NextResponse.json({ error: "Credit note not found" }, { status: 404 })
        }

        // Delete the credit note
        deleteResult = await sql`
          DELETE FROM credit_notes
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        // Log the deletion
        await sql`
          INSERT INTO admin_logs (
            action,
            resource_type,
            resource_id,
            old_values,
            admin_id,
            created_at
          ) VALUES (
            'credit_note_deleted',
            'credit_note',
            ${documentId},
            ${JSON.stringify({
              customer_id: customerId,
              document_type,
              document_details: documentDetails[0],
            })},
            1,
            NOW()
          )
        `
        break

      case "invoice":
      case "recurring":
      default:
        // Get invoice details before deletion
        documentDetails = await sql`
          SELECT * FROM invoices
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        if (documentDetails.length === 0) {
          return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
        }

        // Delete the invoice
        deleteResult = await sql`
          DELETE FROM invoices
          WHERE id = ${documentId}
          AND customer_id = ${customerId}
        `

        // Log the deletion
        await sql`
          INSERT INTO admin_logs (
            action,
            resource_type,
            resource_id,
            old_values,
            admin_id,
            created_at
          ) VALUES (
            'invoice_deleted',
            'invoice',
            ${documentId},
            ${JSON.stringify({
              customer_id: customerId,
              document_type,
              document_details: documentDetails[0],
            })},
            1,
            NOW()
          )
        `
        break
    }

    return NextResponse.json({
      success: true,
      message: `${document_type} deleted successfully`,
    })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
