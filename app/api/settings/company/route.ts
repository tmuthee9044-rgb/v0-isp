import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const settings = await sql`
      SELECT 
        name as company_name,
        company_trading_name,
        company_registration_number,
        company_tax_number,
        company_description,
        company_industry,
        company_size,
        company_founded_year,
        logo,
        favicon,
        branding_primary_color,
        branding_secondary_color,
        branding_accent_color,
        main_phone as primary_phone,
        contact_secondary_phone,
        main_email as primary_email,
        support_email as contact_support_email,
        website,
        social_facebook as contact_facebook,
        social_twitter as contact_twitter,
        social_linkedin as contact_linkedin,
        physical_address as street_address,
        city as contact_city,
        state as contact_state,
        postal_code as contact_postal_code,
        country as contact_country,
        localization_language,
        localization_currency,
        localization_timezone,
        localization_date_format,
        localization_time_format,
        localization_number_format,
        localization_week_start,
        company_prefix,
        tax_system,
        tax_rate
      FROM company_profiles 
      WHERE id = 1
    `

    return NextResponse.json({
      success: true,
      settings: settings[0] || {},
    })
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return NextResponse.json({ error: "Failed to fetch company settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sql = await getSql()
    const formData = await request.formData()

    const data: Record<string, any> = {}
    formData.forEach((value, key) => {
      data[key] = value
    })

    const result = await sql`
      INSERT INTO company_profiles (
        id,
        name,
        company_trading_name,
        company_registration_number,
        company_tax_number,
        company_description,
        company_industry,
        company_size,
        company_founded_year,
        branding_primary_color,
        branding_secondary_color,
        branding_accent_color,
        main_phone,
        contact_secondary_phone,
        main_email,
        support_email,
        website,
        social_facebook,
        social_twitter,
        social_linkedin,
        physical_address,
        city,
        state,
        postal_code,
        country,
        localization_language,
        localization_currency,
        localization_timezone,
        localization_date_format,
        localization_time_format,
        localization_number_format,
        localization_week_start,
        company_prefix,
        tax_system,
        tax_rate,
        updated_at
      ) VALUES (
        1,
        ${data.company_name || "My ISP Company"},
        ${data.trading_name || null},
        ${data.registration_number || null},
        ${data.tax_number || null},
        ${data.description || null},
        ${data.industry || "telecommunications"},
        ${data.company_size || "medium"},
        ${data.founded_year ? Number.parseInt(data.founded_year) : null},
        ${data.primary_color || "#3b82f6"},
        ${data.secondary_color || "#64748b"},
        ${data.accent_color || "#16a34a"},
        ${data.primary_phone || null},
        ${data.secondary_phone || null},
        ${data.primary_email || null},
        ${data.support_email || null},
        ${data.website || null},
        ${data.social_facebook || null},
        ${data.social_twitter || null},
        ${data.social_linkedin || null},
        ${data.street_address || null},
        ${data.city || null},
        ${data.state || null},
        ${data.postal_code || null},
        ${data.country || "Kenya"},
        ${data.default_language || "en"},
        ${data.currency || "KES"},
        ${data.timezone || "Africa/Nairobi"},
        ${data.date_format || "dd/mm/yyyy"},
        ${data.time_format || "24h"},
        ${data.number_format || "comma"},
        ${data.week_start || "monday"},
        ${data.company_prefix || null},
        ${data.tax_system || "vat"},
        ${data.tax_rate ? Number.parseFloat(data.tax_rate) : 16.0},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        company_trading_name = EXCLUDED.company_trading_name,
        company_registration_number = EXCLUDED.company_registration_number,
        company_tax_number = EXCLUDED.company_tax_number,
        company_description = EXCLUDED.company_description,
        company_industry = EXCLUDED.company_industry,
        company_size = EXCLUDED.company_size,
        company_founded_year = EXCLUDED.company_founded_year,
        branding_primary_color = EXCLUDED.branding_primary_color,
        branding_secondary_color = EXCLUDED.branding_secondary_color,
        branding_accent_color = EXCLUDED.branding_accent_color,
        main_phone = EXCLUDED.main_phone,
        contact_secondary_phone = EXCLUDED.contact_secondary_phone,
        main_email = EXCLUDED.main_email,
        support_email = EXCLUDED.support_email,
        website = EXCLUDED.website,
        social_facebook = EXCLUDED.social_facebook,
        social_twitter = EXCLUDED.social_twitter,
        social_linkedin = EXCLUDED.social_linkedin,
        physical_address = EXCLUDED.physical_address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        localization_language = EXCLUDED.localization_language,
        localization_currency = EXCLUDED.localization_currency,
        localization_timezone = EXCLUDED.localization_timezone,
        localization_date_format = EXCLUDED.localization_date_format,
        localization_time_format = EXCLUDED.localization_time_format,
        localization_number_format = EXCLUDED.localization_number_format,
        localization_week_start = EXCLUDED.localization_week_start,
        company_prefix = EXCLUDED.company_prefix,
        tax_system = EXCLUDED.tax_system,
        tax_rate = EXCLUDED.tax_rate,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error) {
    console.error("Error updating company settings:", error)
    return NextResponse.json({ error: "Failed to update company settings" }, { status: 500 })
  }
}
