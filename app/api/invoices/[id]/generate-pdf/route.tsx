import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateInvoiceHTML } from "@/lib/html-templates"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoiceId = Number.parseInt(params.id)

    // Get invoice with customer details
    const invoiceResult = await sql`
      SELECT 
        i.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.email,
        c.phone,
        c.address,
        c.billing_address,
        c.account_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${invoiceId}
    `

    if (invoiceResult.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]

    // Get company profile
    const companyResult = await sql`
      SELECT * FROM company_profiles LIMIT 1
    `

    if (companyResult.length === 0) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    const company = companyResult[0]

    // Get invoice items
    const itemsResult = await sql`
      SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId}
    `

    // Prepare invoice data
    const invoiceData = {
      customer: {
        id: invoice.customer_id,
        first_name: invoice.first_name,
        last_name: invoice.last_name,
        business_name: invoice.business_name,
        email: invoice.email,
        phone: invoice.phone,
        address: invoice.billing_address || invoice.address || "Address not provided",
        account_number: invoice.account_number,
      },
      company: {
        company_name: company.company_name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        tax_number: company.tax_number,
        registration_number: company.registration_number,
        website: company.website,
      },
      invoice: {
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        subtotal: Number(invoice.subtotal || 0),
        tax_amount: Number(invoice.tax_amount || 0),
        discount_amount: Number(invoice.discount_amount || 0),
        amount: Number(invoice.amount),
        status: invoice.status,
        payment_terms: invoice.payment_terms || 30,
        service_period_start: invoice.service_period_start,
        service_period_end: invoice.service_period_end,
      },
      items: itemsResult.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_amount: Number(item.total_amount),
        tax_rate: Number(item.tax_rate || 0),
      })),
    }

    // Generate HTML
    const htmlContent = generateInvoiceHTML(invoiceData)

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoice.invoice_number}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 })
  }
}
