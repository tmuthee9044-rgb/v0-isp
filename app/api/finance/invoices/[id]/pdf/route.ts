import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import jsPDF from "jspdf"
import "jspdf-autotable"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoiceId = Number.parseInt(params.id)
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 })
    }

    const sql = getSql()

    // Fetch invoice details
    const invoiceResult = await sql`
      SELECT 
        i.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone_number as customer_phone,
        c.physical_address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${invoiceId}
    `

    if (invoiceResult.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]

    // Fetch invoice items
    const itemsResult = await sql`
      SELECT 
        description,
        quantity,
        unit_price,
        tax_amount,
        total_amount
      FROM invoice_items
      WHERE invoice_id = ${invoiceId}
      ORDER BY id
    `

    // Generate PDF
    const doc = new jsPDF()
    const fileName = `invoice-${invoice.invoice_number}.pdf`

    // Add professional letterhead
    addInvoiceLetterhead(doc)

    let yPosition = 80

    // Invoice Title
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("INVOICE", 105, yPosition, { align: "center" })
    yPosition += 15

    // Invoice details
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, yPosition)
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 150, yPosition)
    yPosition += 6
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 150, yPosition)
    yPosition += 6
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 150, yPosition)
    yPosition += 15

    // Customer details
    doc.setFont("helvetica", "bold")
    doc.text("BILL TO:", 20, yPosition)
    yPosition += 6
    doc.setFont("helvetica", "normal")
    doc.text(invoice.customer_name, 20, yPosition)
    yPosition += 5
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, 20, yPosition)
      yPosition += 5
    }
    if (invoice.customer_phone) {
      doc.text(invoice.customer_phone, 20, yPosition)
      yPosition += 5
    }
    if (invoice.customer_address) {
      doc.text(invoice.customer_address, 20, yPosition)
      yPosition += 5
    }
    yPosition += 10

    // Invoice items table
    const tableData = itemsResult.map((item: any) => [
      item.description,
      item.quantity.toString(),
      `KES ${Number(item.unit_price).toLocaleString()}`,
      `KES ${Number(item.tax_amount).toLocaleString()}`,
      `KES ${Number(item.total_amount).toLocaleString()}`,
    ])
    ;(doc as any).autoTable({
      head: [["Description", "Quantity", "Unit Price", "Tax", "Total"]],
      body: tableData,
      startY: yPosition,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Totals
    const totalsData = [
      ["Subtotal", `KES ${Number(invoice.subtotal).toLocaleString()}`],
      ["Tax", `KES ${Number(invoice.tax_amount).toLocaleString()}`],
      ["Discount", `KES ${Number(invoice.discount_amount || 0).toLocaleString()}`],
      ["TOTAL", `KES ${Number(invoice.total_amount).toLocaleString()}`],
    ]
    ;(doc as any).autoTable({
      body: totalsData,
      startY: yPosition,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", halign: "right", cellWidth: 130 },
        1: { halign: "right", cellWidth: 50 },
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    // Payment information
    if (invoice.status === "paid" && invoice.paid_date) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(39, 174, 96)
      doc.text(`PAID on ${new Date(invoice.paid_date).toLocaleDateString()}`, 105, yPosition, { align: "center" })
      doc.setTextColor(0, 0, 0)
    } else {
      doc.setFontSize(9)
      doc.setFont("helvetica", "italic")
      doc.text("Payment Terms: Payment due within 30 days", 20, yPosition)
      yPosition += 5
      doc.text("Please include invoice number on payment", 20, yPosition)
    }

    // Add footer
    addInvoiceFooter(doc, 1, 1)

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 })
  }
}

function addInvoiceLetterhead(doc: jsPDF) {
  // Header background
  doc.setFillColor(41, 128, 185)
  doc.rect(0, 0, 210, 35, "F")

  // Company logo placeholder
  doc.setFillColor(255, 255, 255)
  doc.circle(25, 17.5, 8, "F")
  doc.setFillColor(41, 128, 185)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("ISP", 25, 19, { align: "center" })

  // Company details
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("ISP MANAGEMENT SYSTEM", 45, 15)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Billing Department", 45, 21)
  doc.text("Email: billing@isp-system.com | Phone: +254 700 000 000", 45, 26)
  doc.text("Address: Nairobi, Kenya", 45, 31)

  doc.setTextColor(0, 0, 0)

  // Horizontal line
  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.5)
  doc.line(20, 40, 190, 40)
}

function addInvoiceFooter(doc: jsPDF, currentPage: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height

  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.5)
  doc.line(20, pageHeight - 20, 190, pageHeight - 20)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)

  doc.text("Thank you for your business!", 20, pageHeight - 15)
  doc.text("ISP Management System", 105, pageHeight - 15, { align: "center" })
  doc.text(`Page ${currentPage} of ${totalPages}`, 190, pageHeight - 15, { align: "right" })

  doc.setTextColor(0, 0, 0)
}
