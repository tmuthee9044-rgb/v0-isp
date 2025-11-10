import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const settings = await sql`
      SELECT 
        key, 
        value 
      FROM system_config 
      WHERE key IN (
        'company_name', 'company_prefix', 'company_trading_name', 
        'company_registration_number', 'company_tax_number', 
        'company_description', 'company_industry', 'company_size', 
        'company_founded_year', 'default_language', 'currency', 
        'timezone', 'date_format', 'time_format', 'number_format', 
        'week_start', 'tax_system', 'tax_rate'
      )
    `

    const settingsObject: Record<string, string> = {}

    // Process existing settings
    if (settings && Array.isArray(settings)) {
      settings.forEach((setting: any) => {
        if (setting.key && setting.value !== null) {
          settingsObject[setting.key] = setting.value
        }
      })
    }

    // Provide default values for missing settings
    const defaultSettings = {
      company_name: settingsObject.company_name || "Trust Waves Network",
      company_prefix: settingsObject.company_prefix || "TWN",
      company_trading_name: settingsObject.company_trading_name || "Trust Waves Network",
      company_registration_number: settingsObject.company_registration_number || "",
      company_tax_number: settingsObject.company_tax_number || "",
      company_description: settingsObject.company_description || "Internet Service Provider",
      company_industry: settingsObject.company_industry || "Telecommunications",
      company_size: settingsObject.company_size || "Small",
      company_founded_year: settingsObject.company_founded_year || "2020",
      default_language: settingsObject.default_language || "en",
      currency: settingsObject.currency || "KES",
      timezone: settingsObject.timezone || "Africa/Nairobi",
      date_format: settingsObject.date_format || "DD/MM/YYYY",
      time_format: settingsObject.time_format || "24h",
      number_format: settingsObject.number_format || "1,234.56",
      week_start: settingsObject.week_start || "monday",
      tax_system: settingsObject.tax_system || "inclusive",
      tax_rate: settingsObject.tax_rate || "16",
    }

    return new Response(JSON.stringify(defaultSettings), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[v0] Company settings API error:", error)

    const fallbackSettings = {
      company_name: "Trust Waves Network",
      company_prefix: "TWN",
      company_trading_name: "Trust Waves Network",
      company_registration_number: "",
      company_tax_number: "",
      company_description: "Internet Service Provider",
      company_industry: "Telecommunications",
      company_size: "Small",
      company_founded_year: "2020",
      default_language: "en",
      currency: "KES",
      timezone: "Africa/Nairobi",
      date_format: "DD/MM/YYYY",
      time_format: "24h",
      number_format: "1,234.56",
      week_start: "monday",
      tax_system: "inclusive",
      tax_rate: "16",
    }

    return new Response(JSON.stringify(fallbackSettings), {
      headers: { "Content-Type": "application/json" },
    })
  }
}
