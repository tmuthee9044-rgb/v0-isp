import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id

    // Try to fetch from invoices first
    const invoice = await sql`
      SELECT 
        i.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.customer_type,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.postal_code
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${documentId}
    `

    if (invoice.length > 0) {
      const doc = invoice[0]
      const customerName = doc.business_name || `${doc.first_name} ${doc.last_name}`

      // Generate simple text-based invoice
      const content = `
INVOICE
========================================

Invoice Number: ${doc.invoice_number}
Invoice Date: ${new Date(doc.invoice_date || doc.created_at).toLocaleDateString()}
Due Date: ${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : "N/A"}
Status: ${doc.status.toUpperCase()}

BILL TO:
${customerName}
${doc.email || ""}
${doc.phone || ""}
${doc.address || ""}
${doc.city ? `${doc.city}, ${doc.state} ${doc.postal_code}` : ""}

========================================

Description: ${doc.description || "Service"}
Amount: KES ${Number.parseFloat(doc.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${doc.notes ? `\nNotes:\n${doc.notes}` : ""}

========================================
Total Amount Due: KES ${Number.parseFloat(doc.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
========================================
      `.trim()

      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="invoice-${doc.invoice_number}.txt"`,
        },
      })
    }

    // Try payments table
    const payment = await sql`
      SELECT 
        p.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.customer_type,
        c.email,
        c.phone
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ${documentId}
    `

    if (payment.length > 0) {
      const doc = payment[0]
      const customerName = doc.business_name || `${doc.first_name} ${doc.last_name}`

      // Generate simple text-based receipt
      const content = `
PAYMENT RECEIPT
========================================

Transaction ID: ${doc.transaction_id}
Payment Date: ${doc.payment_date ? new Date(doc.payment_date).toLocaleDateString() : new Date(doc.created_at).toLocaleDateString()}
Payment Method: ${doc.payment_method}
Status: ${doc.status.toUpperCase()}

PAID BY:
${customerName}
${doc.email || ""}
${doc.phone || ""}

========================================

Amount Paid: KES ${Number.parseFloat(doc.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

========================================
Thank you for your payment!
========================================
      `.trim()

      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="receipt-${doc.transaction_id}.txt"`,
        },
      })
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  } catch (error) {
    console.error("Failed to download document:", error)
    return NextResponse.json(
      {
        error: "Failed to download document: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}
