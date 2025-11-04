import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id

    const invoice = await sql`
      SELECT 
        i.id,
        i.customer_id,
        'invoice' as type,
        i.invoice_number as reference_number,
        i.invoice_number,
        i.description,
        i.notes,
        i.amount,
        i.amount as total_amount,
        i.status,
        i.due_date,
        i.created_at,
        i.updated_at,
        i.invoice_date,
        null as payment_date,
        '{}' as metadata,
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
      return NextResponse.json({
        success: true,
        document: invoice[0],
      })
    }

    // If not found in invoices, try payments table
    const payment = await sql`
      SELECT 
        p.id,
        p.customer_id,
        'payment' as type,
        p.transaction_id as reference_number,
        null as invoice_number,
        CONCAT('Payment - ', p.payment_method) as description,
        null as notes,
        p.amount,
        p.amount as total_amount,
        p.status,
        null as due_date,
        p.created_at,
        p.created_at as updated_at,
        null as invoice_date,
        p.payment_date,
        '{}' as metadata,
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
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ${documentId}
    `

    if (payment.length > 0) {
      return NextResponse.json({
        success: true,
        document: payment[0],
      })
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  } catch (error) {
    console.error("Failed to fetch document:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch document: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id
    const body = await request.json()

    if (body.type === "invoice") {
      const updatedInvoice = await sql`
        UPDATE invoices 
        SET 
          invoice_number = ${body.invoice_number || body.reference_number},
          description = ${body.description},
          notes = ${body.notes},
          amount = ${body.amount || 0},
          status = ${body.status || "draft"},
          due_date = ${body.due_date},
          invoice_date = ${body.invoice_date},
          updated_at = NOW()
        WHERE id = ${documentId}
        RETURNING *
      `

      if (updatedInvoice.length === 0) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        document: updatedInvoice[0],
      })
    } else if (body.type === "payment") {
      const updatedPayment = await sql`
        UPDATE payments 
        SET 
          amount = ${body.amount || 0},
          status = ${body.status || "pending"},
          payment_date = ${body.payment_date}
        WHERE id = ${documentId}
        RETURNING *
      `

      if (updatedPayment.length === 0) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        document: updatedPayment[0],
      })
    }

    return NextResponse.json({ error: "Invalid document type or document not found" }, { status: 400 })
  } catch (error) {
    console.error("Failed to update document:", error)
    return NextResponse.json(
      {
        error: "Failed to update document: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}
