import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateCreditNoteHTML } from "@/lib/html-templates"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, reason, items, originalInvoiceNumber } = body

    // Get customer details
    const customerResult = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (customerResult.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult[0]

    // Get company profile
    const companyResult = await sql`
      SELECT * FROM company_profiles LIMIT 1
    `

    if (companyResult.length === 0) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    const company = companyResult[0]

    // Generate credit note number
    const creditNoteDate = new Date()
    const creditNoteNumber = `CN-${customerId}-${creditNoteDate.getFullYear()}${String(creditNoteDate.getMonth() + 1).padStart(2, "0")}${String(creditNoteDate.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-4)}`

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
    const taxAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
      0,
    )
    const totalAmount = subtotal + taxAmount

    // Prepare credit note data
    const creditNoteData = {
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        business_name: customer.business_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || customer.billing_address || "Address not provided",
        account_number: customer.account_number,
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
      creditNote: {
        credit_note_number: creditNoteNumber,
        credit_note_date: creditNoteDate.toISOString(),
        original_invoice_number: originalInvoiceNumber,
        reason: reason,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: "pending",
      },
      items: items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_amount: Number(item.quantity * item.unit_price),
        tax_rate: Number(item.tax_rate || 0),
      })),
    }

    // Generate HTML
    const htmlContent = generateCreditNoteHTML(creditNoteData)

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Credit Note - ${creditNoteNumber}</title>
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
        "Content-Disposition": `attachment; filename="credit-note-${creditNoteNumber}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating credit note:", error)
    return NextResponse.json({ error: "Failed to generate credit note" }, { status: 500 })
  }
}
