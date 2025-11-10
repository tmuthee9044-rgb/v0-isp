import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface CurrencyConfig {
  code: string
  locale: string
  symbol: string
}

const CURRENCY_MAP: Record<string, CurrencyConfig> = {
  kes: { code: "KES", locale: "en-KE", symbol: "KSh" },
  ugx: { code: "UGX", locale: "en-UG", symbol: "USh" },
  tzs: { code: "TZS", locale: "en-TZ", symbol: "TSh" },
  usd: { code: "USD", locale: "en-US", symbol: "$" },
  eur: { code: "EUR", locale: "en-EU", symbol: "€" },
  gbp: { code: "GBP", locale: "en-GB", symbol: "£" },
}

let cachedSettings: { currency: string; timestamp: number } | null = null
const CACHE_DURATION = 60000 // 1 minute cache

async function getLocalizationSettings(): Promise<string> {
  // Check cache first
  if (cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_DURATION) {
    return cachedSettings.currency
  }

  try {
    const result = await sql`
      SELECT currency 
      FROM company_profiles 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    const currency = result[0]?.currency?.toLowerCase() || "kes"
    cachedSettings = { currency, timestamp: Date.now() }
    return currency
  } catch (error) {
    console.error("[v0] Error fetching localization settings:", error)
    return "kes" // Default fallback
  }
}

export async function formatCurrencyServer(amount: number | string): Promise<string> {
  const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return "0"
  }

  const currency = await getLocalizationSettings()
  const config = CURRENCY_MAP[currency] || CURRENCY_MAP.kes

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(numAmount))
}

export async function getCurrencyConfig(): Promise<CurrencyConfig> {
  const currency = await getLocalizationSettings()
  return CURRENCY_MAP[currency] || CURRENCY_MAP.kes
}
