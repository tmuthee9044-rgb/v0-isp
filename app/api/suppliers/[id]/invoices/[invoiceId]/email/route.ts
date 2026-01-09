import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const { id: supplierId, invoiceId } = params
    const { recipient_email, subject, message } = await request.json()

    // Fetch invoice details
    const [invoice] = await sql`
      SELECT 
        si.*,
        s.company_name as supplier_name,
        s.email as supplier_email,
        po.order_number as po_number
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
      WHERE si.id = ${invoiceId} AND si.supplier_id = ${supplierId}
    `

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const emailRecipient = recipient_email || invoice.supplier_email

    if (!emailRecipient) {
      return NextResponse.json({ error: "No recipient email address provided" }, { status: 400 })
    }

    // In a real implementation, you would integrate with an email service like SendGrid, Resend, or AWS SES
    // For now, we'll log the email attempt
    console.log("[v0] Email would be sent to:", emailRecipient)
    console.log("[v0] Subject:", subject || `Invoice ${invoice.invoice_number}`)
    console.log("[v0] Message:", message || "Please find attached your invoice.")
    console.log("[v0] Invoice PDF URL:", `/api/suppliers/${supplierId}/invoices/${invoiceId}/pdf`)

    // Log the email attempt
    await sql`
      INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        ip_address,
        created_at
      ) VALUES (
        'supplier_invoice_emailed',
        'supplier_invoice',
        ${invoiceId},
        ${JSON.stringify({
          recipient: emailRecipient,
          subject: subject || `Invoice ${invoice.invoice_number}`,
          invoice_number: invoice.invoice_number,
        })},
        'system',
        NOW()
      )
    `

    // TODO: Integrate with actual email service
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to: emailRecipient,
    //   subject: subject || `Invoice ${invoice.invoice_number}`,
    //   html: message || `Please find your invoice attached.`,
    //   attachments: [{
    //     filename: `invoice-${invoice.invoice_number}.pdf`,
    //     content: pdfBuffer,
    //   }]
    // })

    return NextResponse.json({
      success: true,
      message: `Invoice email sent to ${emailRecipient}`,
      note: "Email integration pending - currently logging only",
    })
  } catch (error) {
    console.error("[v0] Error sending invoice email:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invoice email" },
      { status: 500 },
    )
  }
}
