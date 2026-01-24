import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"
import { generateSupplierInvoicePDF } from "@/lib/pdf-generator"

export async function GET(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const sql = await getSql()
    const { id: supplierId, invoiceId } = params

    console.log("[v0] Generating PDF for supplier:", supplierId, "invoice:", invoiceId)

    // Fetch invoice data with supplier details
    const invoiceData = await sql`
      SELECT 
        si.*,
        s.company_name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        s.contact_person,
        po.order_number as po_number
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
      WHERE si.id = ${invoiceId}
      AND si.supplier_id = ${supplierId}
    `

    if (invoiceData.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceData[0]

    // Fetch invoice items
    console.log("[v0] Fetching invoice items for invoice:", invoiceId)
    const invoiceItems = await sql`
      SELECT 
        sii.id,
        sii.description,
        sii.quantity,
        sii.unit_price,
        sii.total_amount,
        sii.item_name
      FROM supplier_invoice_items sii
      WHERE sii.invoice_id = ${invoiceId}
      ORDER BY sii.id ASC
    `

    console.log("[v0] Found", invoiceItems.length, "invoice items")

    // Fetch company settings for letterhead
    const companySettings = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('company_name', 'company_address', 'company_phone', 'company_email', 'company_logo')
    `

    const companyInfo = {
      name: companySettings.find((s: any) => s.key === "company_name")?.value || "Your Company Name",
      address: companySettings.find((s: any) => s.key === "company_address")?.value || "123 Business Street",
      phone: companySettings.find((s: any) => s.key === "company_phone")?.value || "+254 700 000 000",
      email: companySettings.find((s: any) => s.key === "company_email")?.value || "info@company.com",
    }

    // Generate PDF with items
    const pdfBytes = await generateSupplierInvoicePDF({
      invoice: {
        ...invoice,
        items: invoiceItems,
      },
      companyInfo,
    })

    // Return PDF as download
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="supplier-invoice-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating invoice PDF:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 },
    )
  }
}
