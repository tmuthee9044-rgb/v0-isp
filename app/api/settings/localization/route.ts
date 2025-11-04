import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const settings = await sql`
      SELECT 
        default_language as localization_language,
        currency as localization_currency,
        timezone as localization_timezone,
        date_format as localization_date_format,
        time_format as localization_time_format,
        number_format as localization_number_format,
        week_start as localization_week_start,
        company_prefix,
        tax_system,
        tax_rate
      FROM company_profiles
      LIMIT 1
    `

    if (settings.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        localization_language: "en",
        localization_currency: "KES",
        localization_timezone: "Africa/Nairobi",
        localization_date_format: "DD/MM/YYYY",
        localization_time_format: "24h",
        localization_number_format: "comma",
        localization_week_start: "Monday",
        company_prefix: "ISP",
        tax_system: "VAT",
        tax_rate: 16,
      })
    }

    return NextResponse.json(settings[0])
  } catch (error) {
    console.error("[v0] Error fetching localization settings:", error)
    return NextResponse.json({
      localization_language: "en",
      localization_currency: "KES",
      localization_timezone: "Africa/Nairobi",
      localization_date_format: "DD/MM/YYYY",
      localization_time_format: "24h",
      localization_number_format: "comma",
      localization_week_start: "Monday",
      company_prefix: "ISP",
      tax_system: "VAT",
      tax_rate: 16,
    })
  }
}
