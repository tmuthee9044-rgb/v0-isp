import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const settings = await sql`
      SELECT 
        company_name,
        company_trading_name,
        company_registration_number,
        company_tax_number,
        primary_phone,
        primary_email,
        website,
        street_address,
        city,
        state,
        postal_code,
        country,
        branding_primary_color,
        branding_secondary_color,
        currency
      FROM system_config 
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
