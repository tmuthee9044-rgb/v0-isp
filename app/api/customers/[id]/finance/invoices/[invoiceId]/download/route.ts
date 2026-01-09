import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jsPDF from "jspdf"
import "jspdf-autotable"

const sql = neon(process.env.DATABASE_URL!)

async function getCompanySettings() {
  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'company_%' OR key LIKE 'branding_%' OR key LIKE 'contact_%'
    `

    const settingsObject: Record<string, any> = {}
    settings.forEach((setting: any) => {
      try {
        settingsObject[setting.key] = JSON.parse(setting.value)
      } catch {
        settingsObject[setting.key] = setting.value
      }
    })

    return settingsObject
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return {}
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const invoiceId = Number.parseInt(params.invoiceId)

    const companySettings = await getCompanySettings()

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Get invoice with items
    const [invoice] = await sql`
      SELECT 
        i.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ii.id,
              'description', ii.description,
              'quantity', ii.quantity,
              'unit_price', ii.unit_price,
              'total_amount', ii.total_amount,
              'service_plan_name', sp.name
            )
          ) FILTER (WHERE ii.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN service_plans sp ON ii.service_plan_id = sp.id
      WHERE i.id = ${invoiceId} AND i.customer_id = ${customerId}
      GROUP BY i.id
    `

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Generate PDF
    const doc = new jsPDF()
    const fileName = `invoice-${invoice.invoice_number}.pdf`

    const companyName = companySettings.company_name || companySettings.company_trading_name || "Trust Waves ISP"
    const primaryColor = companySettings.branding_primary_color || "#2563eb"

    // Convert hex color to RGB for jsPDF
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 37, g: 99, b: 235 }
    }

    const brandColor = hexToRgb(primaryColor)

    // Company Header with dynamic information
    doc.setFontSize(24)
    doc.setTextColor(40, 40, 40)
    doc.text(companyName, 20, 25)

    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text("Internet Service Provider", 20, 35)

    const primaryEmail = companySettings.contact_primary_email || "billing@trustwavesnetwork.com"
    const primaryPhone = companySettings.contact_primary_phone || "+254 700 000 000"
    const website = companySettings.contact_website || ""
    const address = companySettings.contact_street_address || ""
    const city = companySettings.contact_city || ""
    const state = companySettings.contact_state || ""

    doc.text(`Email: ${primaryEmail}`, 20, 45)
    doc.text(`Phone: ${primaryPhone}`, 20, 55)
    if (website) {
      doc.text(`Website: ${website}`, 20, 65)
    }
    if (address) {
      doc.text(`${address}`, 20, 75)
      if (city || state) {
        doc.text(`${city}${city && state ? ", " : ""}${state}`, 20, 85)
      }
    }

    // Invoice Title with brand color
    doc.setFontSize(20)
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.text("INVOICE", 150, 25)

    // Invoice Details Box
    doc.setFontSize(12)
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 40)
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 150, 50)
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 150, 60)
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 150, 70)

    // Customer Details
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text("Bill To:", 20, 85)

    doc.setFontSize(12)
    doc.text(`${customer.first_name} ${customer.last_name}`, 20, 95)
    doc.text(`${customer.email}`, 20, 105)
    doc.text(`${customer.phone}`, 20, 115)
    if (customer.address) {
      doc.text(`${customer.address}`, 20, 125)
    }

    // Service Period
    if (invoice.service_period_start && invoice.service_period_end) {
      doc.text("Service Period:", 150, 85)
      doc.text(
        `${new Date(invoice.service_period_start).toLocaleDateString()} - ${new Date(invoice.service_period_end).toLocaleDateString()}`,
        150,
        95,
      )
    }

    // Invoice Items Table
    const items = Array.isArray(invoice.items) ? invoice.items : []
    const tableData = items.map((item: any) => [
      item.description || item.service_plan_name || "Service",
      item.quantity?.toString() || "1",
      `KES ${Number(item.unit_price || 0).toLocaleString()}`,
      `KES ${Number(item.total_amount || 0).toLocaleString()}`,
    ])
    ;(doc as any).autoTable({
      head: [["Description", "Quantity", "Unit Price", "Total"]],
      body: tableData,
      startY: 140,
      theme: "striped",
      headStyles: {
        fillColor: [brandColor.r, brandColor.g, brandColor.b],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
    })

    // Totals section
    const finalY = (doc as any).lastAutoTable.finalY + 20
    const totalsX = 130

    doc.setFontSize(12)
    doc.text("Subtotal:", totalsX, finalY)
    doc.text(`KES ${Number(invoice.subtotal || 0).toLocaleString()}`, totalsX + 40, finalY)

    if (invoice.tax_amount && Number(invoice.tax_amount) > 0) {
      doc.text("Tax:", totalsX, finalY + 10)
      doc.text(`KES ${Number(invoice.tax_amount).toLocaleString()}`, totalsX + 40, finalY + 10)
    }

    if (invoice.discount_amount && Number(invoice.discount_amount) > 0) {
      doc.text("Discount:", totalsX, finalY + 20)
      doc.text(`-KES ${Number(invoice.discount_amount).toLocaleString()}`, totalsX + 40, finalY + 20)
    }

    // Total line
    doc.setFontSize(14)
    doc.setFont(undefined, "bold")
    const totalY = finalY + (invoice.tax_amount > 0 ? 30 : 20)
    doc.text("TOTAL:", totalsX, totalY)
    doc.text(`KES ${Number(invoice.amount).toLocaleString()}`, totalsX + 40, totalY)

    // Payment Instructions with dynamic information
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.setTextColor(100, 100, 100)
    doc.text("Payment Instructions:", 20, totalY + 20)
    doc.text("• M-Pesa: Pay Bill 123456, Account: Your Customer ID", 20, totalY + 30)
    doc.text("• Bank Transfer: Account details available on request", 20, totalY + 40)
    if (website) {
      doc.text(`• Online: Visit ${website} to pay online`, 20, totalY + 50)
    } else {
      doc.text("• Online: Visit our customer portal to pay online", 20, totalY + 50)
    }

    // Footer with dynamic company name
    doc.text(`Thank you for choosing ${companyName}!`, 20, totalY + 70)

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 })
  }
}
