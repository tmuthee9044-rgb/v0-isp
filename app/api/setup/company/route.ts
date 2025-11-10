import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const companyData = await request.json()

    // Insert or update company information in system_config table
    await sql`
      INSERT INTO system_config (config_key, config_value, description, updated_at)
      VALUES 
        ('company_name', ${companyData.name}, 'Company name', NOW()),
        ('company_address', ${companyData.address}, 'Company address', NOW()),
        ('company_phone', ${companyData.phone}, 'Company phone number', NOW()),
        ('company_email', ${companyData.email}, 'Company email address', NOW()),
        ('company_website', ${companyData.website || ""}, 'Company website', NOW()),
        ('company_license', ${companyData.license || ""}, 'ISP license number', NOW()),
        ('company_timezone', ${companyData.timezone}, 'Company timezone', NOW())
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, message: "Company information saved successfully" })
  } catch (error) {
    console.error("Error saving company information:", error)
    return NextResponse.json({ success: false, error: "Failed to save company information" }, { status: 500 })
  }
}
