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
    const creditNoteId = Number.parseInt(params.id)

    const companySettings = await getCompanySettings()

    // Get credit note with customer and invoice details
    const [creditNote] = await sql`
      SELECT 
        cn.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.email,
        c.phone,
        c.address,
        i.invoice_number
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.id = ${creditNoteId}
    `

    if (!creditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 })
    }

    // Generate PDF
    const doc = new jsPDF()
    const fileName = `credit-note-${creditNote.credit_note_number || creditNote.id}.pdf`

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

    // Credit Note Title
    doc.setFontSize(24)
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.setFont("helvetica", "bold")
    doc.text("CREDIT NOTE", 20, 70)

    // Credit Note Details
    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "normal")

    doc.text(`Credit Note #: ${creditNote.credit_note_number || `CN-${creditNote.id}`}`, 20, 90)
    doc.text(`Issue Date: ${new Date(creditNote.created_at).toLocaleDateString()}`, 20, 100)

    if (creditNote.invoice_number) {
      doc.text(`Related Invoice: ${creditNote.invoice_number}`, 20, 110)
    }

    doc.text(`Status: ${(creditNote.status || "Approved").toUpperCase()}`, 20, 120)

    // Customer Details
    doc.setFont("helvetica", "bold")
    doc.text("Issued To:", 120, 90)
    doc.setFont("helvetica", "normal")

    const customerName =
      creditNote.business_name || `${creditNote.first_name || ""} ${creditNote.last_name || ""}`.trim()
    doc.text(customerName || "Customer", 120, 100)

    if (creditNote.email) {
      doc.text(creditNote.email, 120, 110)
    }
    if (creditNote.phone) {
      doc.text(creditNote.phone, 120, 120)
    }

    // Credit Amount Box
    doc.setFillColor(240, 240, 240)
    doc.rect(20, 135, 170, 30, "F")

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40, 40, 40)
    doc.text("Credit Amount:", 30, 150)

    doc.setFontSize(20)
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b)
    doc.text(`KES ${Number(creditNote.amount).toLocaleString()}`, 30, 160)

    // Reason
    if (creditNote.reason || creditNote.notes) {
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.setFont("helvetica", "bold")
      doc.text("Reason:", 20, 180)

      doc.setFont("helvetica", "normal")
      const reason = creditNote.reason || creditNote.notes || ""
      const splitReason = doc.splitTextToSize(reason, 170)
      doc.text(splitReason, 20, 190)
    }

    // Note about credit usage
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.setFont("helvetica", "italic")
    doc.text("This credit note can be applied to future invoices or refunded as per company policy.", 20, 230)

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
    console.error("Error generating credit note PDF:", error)
    return NextResponse.json({ error: "Failed to generate credit note PDF" }, { status: 500 })
  }
}
