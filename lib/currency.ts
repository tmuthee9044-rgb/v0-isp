export const CURRENCY_CONFIG = {
  code: "KES",
  symbol: "KSh",
  name: "Kenya Shilling",
  locale: "en-KE",
  decimals: 0,
}

// Currency mapping for different locales
const CURRENCY_MAP: Record<
  string,
  {
    code: string
    locale: string
    symbol: string
  }
> = {
  kes: { code: "KES", locale: "en-KE", symbol: "KSh" },
  ugx: { code: "UGX", locale: "en-UG", symbol: "USh" },
  tzs: { code: "TZS", locale: "en-TZ", symbol: "TSh" },
  usd: { code: "USD", locale: "en-US", symbol: "$" },
  eur: { code: "EUR", locale: "en-EU", symbol: "€" },
  gbp: { code: "GBP", locale: "en-GB", symbol: "£" },
}

export function formatCurrencyWithLocale(amount: number, currencyCode = "kes"): string {
  const config = CURRENCY_MAP[currencyCode.toLowerCase()] || CURRENCY_MAP.kes

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function formatCurrency(amount: number): string {
  return formatCurrencyWithLocale(amount, "kes")
}

export function formatCurrencyCompact(amount: number): string {
  const roundedAmount = Math.round(amount)
  if (roundedAmount >= 1000000) {
    return `KSh ${Math.round(roundedAmount / 1000000)}M`
  } else if (roundedAmount >= 1000) {
    return `KSh ${Math.round(roundedAmount / 1000)}K`
  }
  return formatCurrency(roundedAmount)
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[KSh,\s$€£]/g, "")
  return Number.parseFloat(cleaned) || 0
}

export const TAX_RATES = {
  VAT: 0.16,
  WITHHOLDING_TAX: 0.05,
  SERVICE_CHARGE: 0.1,
}
