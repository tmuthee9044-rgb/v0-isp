import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jsPDF from "jspdf"

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paymentId = Number.parseInt(params.id)

    const companySettings = await getCompanySettings()

    // Get payment with customer details
    const [payment] = await sql`
      SELECT 
        p.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.email,
        c.phone,
        c.address
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ${paymentId}
    `

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Generate PDF
    const doc = new jsPDF()
    const fileName = `payment-receipt-${payment.transaction_id || payment.id}.pdf`

    const companyName = companySettings.company_name || companySettings.company_trading_name || "ISP Company"
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

    // Company Header (Letterhead)
    doc.setFillColor(brandColor.r, brandColor.g, brandColor.b)
    doc.rect(0, 0, 210, 50, "F")

    doc.setFontSize(28)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.text(companyName, 20, 25)

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text("Internet Service Provider", 20, 35)

    // Company contact info on letterhead
    const primaryEmail = companySettings.contact_primary_email || ""
    const primaryPhone = companySettings.contact_primary_phone || ""

    if (primaryEmail) {
      doc.text(`Email: ${primaryEmail}`, 20, 42)
    }
    if (primaryPhone) {
      doc.text(`Phone: ${primaryPhone}`, 120, 42)
    }

    // Receipt Title
    doc.setFontSize(24)
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.setFont("helvetica", "bold")
    doc.text("PAYMENT RECEIPT", 20, 70)

    // Receipt Details
    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "normal")

    doc.text(`Receipt #: ${payment.transaction_id || `PAY-${payment.id}`}`, 20, 90)
    doc.text(`Date: ${new Date(payment.payment_date || payment.created_at).toLocaleDateString()}`, 20, 100)
    doc.text(`Payment Method: ${(payment.payment_method || "Cash").toUpperCase()}`, 20, 110)
    doc.text(`Status: ${(payment.status || "Completed").toUpperCase()}`, 20, 120)

    // Customer Details
    doc.setFont("helvetica", "bold")
    doc.text("Received From:", 120, 90)
    doc.setFont("helvetica", "normal")

    const customerName = payment.business_name || `${payment.first_name || ""} ${payment.last_name || ""}`.trim()
    doc.text(customerName || "Customer", 120, 100)

    if (payment.email) {
      doc.text(payment.email, 120, 110)
    }
    if (payment.phone) {
      doc.text(payment.phone, 120, 120)
    }

    // Payment Amount Box
    doc.setFillColor(240, 240, 240)
    doc.rect(20, 135, 170, 30, "F")

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40, 40, 40)
    doc.text("Amount Paid:", 30, 150)

    doc.setFontSize(20)
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.text(`KES ${Number(payment.amount).toLocaleString()}`, 30, 160)

    // Payment Description
    if (payment.description) {
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.setFont("helvetica", "bold")
      doc.text("Payment For:", 20, 180)

      doc.setFont("helvetica", "normal")
      const splitDescription = doc.splitTextToSize(payment.description, 170)
      doc.text(splitDescription, 20, 190)
    }

    // Thank you message
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.text(`Thank you for your payment!`, 20, 230)

    // Footer with company details
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.setFont("helvetica", "normal")

    const address = companySettings.contact_street_address || ""
    const city = companySettings.contact_city || ""
    const state = companySettings.contact_state || ""
    const website = companySettings.contact_website || ""

    let footerY = 260

    if (address) {
      doc.text(`${address}`, 20, footerY)
      footerY += 5
    }
    if (city || state) {
      doc.text(`${city}${city && state ? ", " : ""}${state}`, 20, footerY)
      footerY += 5
    }
    if (website) {
      doc.text(`Website: ${website}`, 20, footerY)
    }

    // Registration details
    if (companySettings.company_registration_number) {
      doc.text(`Registration No: ${companySettings.company_registration_number}`, 20, 280)
    }
    if (companySettings.company_tax_number) {
      doc.text(`Tax ID: ${companySettings.company_tax_number}`, 120, 280)
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error generating payment receipt PDF:", error)
    return NextResponse.json({ error: "Failed to generate payment receipt PDF" }, { status: 500 })
  }
}
