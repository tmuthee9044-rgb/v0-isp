import type jsPDF from "jspdf"
import { getSql } from "@/lib/db"

export interface CompanyLetterhead {
  name: string
  tradingName?: string
  registrationNumber?: string
  taxNumber?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  mainPhone?: string
  supportPhone?: string
  mainEmail?: string
  supportEmail?: string
  website?: string
  physicalAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  socialFacebook?: string
  socialTwitter?: string
  socialLinkedin?: string
}

export async function getCompanyLetterhead(): Promise<CompanyLetterhead | null> {
  try {
    const sql = await getSql()
    const result = await sql`
      SELECT 
        name,
        trading_name,
        registration_number,
        tax_number,
        logo,
        primary_color,
        secondary_color,
        accent_color,
        main_phone,
        support_phone,
        main_email,
        support_email,
        website,
        physical_address,
        city,
        state,
        postal_code,
        country,
        social_facebook,
        social_twitter,
        social_linkedin
      FROM company_profiles 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    const profile = result[0]
    return {
      name: profile.name,
      tradingName: profile.trading_name,
      registrationNumber: profile.registration_number,
      taxNumber: profile.tax_number,
      logo: profile.logo,
      primaryColor: profile.primary_color || "#3b82f6",
      secondaryColor: profile.secondary_color || "#64748b",
      accentColor: profile.accent_color || "#16a34a",
      mainPhone: profile.main_phone,
      supportPhone: profile.support_phone,
      mainEmail: profile.main_email,
      supportEmail: profile.support_email,
      website: profile.website,
      physicalAddress: profile.physical_address,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postal_code,
      country: profile.country,
      socialFacebook: profile.social_facebook,
      socialTwitter: profile.social_twitter,
      socialLinkedin: profile.social_linkedin,
    }
  } catch (error) {
    console.error("[v0] Error fetching company letterhead:", error)
    return null
  }
}

// Convert hex color to RGB for jsPDF
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [Number.parseInt(result[1], 16), Number.parseInt(result[2], 16), Number.parseInt(result[3], 16)]
    : [59, 130, 246] // Default blue
}

export function addLetterheadToPDF(doc: jsPDF, letterhead: CompanyLetterhead | null, documentTitle?: string) {
  if (!letterhead) {
    // Fallback letterhead
    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246)
    doc.text("Company Name", 20, 20)
    return
  }

  const primaryRgb = hexToRgb(letterhead.primaryColor || "#3b82f6")
  const pageWidth = doc.internal.pageSize.getWidth()

  // In production, you would load and add the actual logo image
  if (letterhead.logo) {
    // doc.addImage(letterhead.logo, 'PNG', 20, 15, 40, 20)
    // Logo position reserved
  }

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
  doc.text(letterhead.name, 20, 25)

  if (letterhead.tradingName) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(`Trading as: ${letterhead.tradingName}`, 20, 31)
  }

  if (documentTitle) {
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    doc.text(documentTitle, pageWidth - 20, 25, { align: "right" })
  }

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)
  let yPos = letterhead.tradingName ? 36 : 31

  const contactLines: string[] = []

  if (letterhead.physicalAddress) {
    contactLines.push(letterhead.physicalAddress)
  }

  const cityLine = [letterhead.city, letterhead.state, letterhead.postalCode].filter(Boolean).join(", ")
  if (cityLine) {
    contactLines.push(cityLine)
  }

  if (letterhead.country) {
    contactLines.push(letterhead.country)
  }

  if (letterhead.mainPhone) {
    contactLines.push(`Tel: ${letterhead.mainPhone}`)
  }

  if (letterhead.mainEmail) {
    contactLines.push(`Email: ${letterhead.mainEmail}`)
  }

  if (letterhead.website) {
    contactLines.push(`Web: ${letterhead.website}`)
  }

  contactLines.forEach((line) => {
    doc.text(line, 20, yPos)
    yPos += 4
  })

  const regLines: string[] = []
  if (letterhead.registrationNumber) {
    regLines.push(`Reg: ${letterhead.registrationNumber}`)
  }
  if (letterhead.taxNumber) {
    regLines.push(`Tax ID: ${letterhead.taxNumber}`)
  }

  if (regLines.length > 0) {
    yPos += 2
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(regLines.join(" | "), 20, yPos)
  }

  yPos += 4
  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
  doc.setLineWidth(0.5)
  doc.line(20, yPos, pageWidth - 20, yPos)

  return yPos + 5 // Return Y position where content should start
}

export function addFooterToPDF(
  doc: jsPDF,
  letterhead: CompanyLetterhead | null,
  currentPage: number,
  totalPages: number,
) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  const primaryRgb = letterhead ? hexToRgb(letterhead.primaryColor || "#3b82f6") : [59, 130, 246]

  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
  doc.setLineWidth(0.3)
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)

  if (letterhead) {
    const footerLines: string[] = []

    if (letterhead.mainEmail) {
      footerLines.push(letterhead.mainEmail)
    }
    if (letterhead.mainPhone) {
      footerLines.push(letterhead.mainPhone)
    }
    if (letterhead.website) {
      footerLines.push(letterhead.website)
    }

    if (footerLines.length > 0) {
      doc.text(footerLines.join(" | "), pageWidth / 2, pageHeight - 20, { align: "center" })
    }

    // Social media links
    const socialLinks: string[] = []
    if (letterhead.socialFacebook) socialLinks.push("Facebook")
    if (letterhead.socialTwitter) socialLinks.push("Twitter")
    if (letterhead.socialLinkedin) socialLinks.push("LinkedIn")

    if (socialLinks.length > 0) {
      doc.text(`Follow us: ${socialLinks.join(", ")}`, pageWidth / 2, pageHeight - 16, { align: "center" })
    }
  }

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: "right" })

  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 10, { align: "left" })
}
