interface LocalizationSettings {
  currency: string
  dateFormat: string
  timeFormat: string
  numberFormat: string
  taxRate: number
}

// Currency formatting
export function formatCurrency(amount: number | string, settings: LocalizationSettings): string {
  const currencySymbols: Record<string, string> = {
    kes: "KES",
    ugx: "UGX",
    tzs: "TZS",
    usd: "$",
  }

  const symbol = currencySymbols[settings.currency.toLowerCase()] || settings.currency.toUpperCase()
  const formattedNumber = formatNumber(amount, settings)

  return `${symbol} ${formattedNumber}`
}

// Number formatting
export function formatNumber(value: number | string | null | undefined, settings: LocalizationSettings): string {
  // Convert to number and handle invalid values
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value

  // Handle null, undefined, or NaN
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return "0.00"
  }

  const parts = numValue.toFixed(2).split(".")
  const integerPart = parts[0]
  const decimalPart = parts[1]

  let formattedInteger = ""

  switch (settings.numberFormat) {
    case "comma":
      // 1,234.56
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      return `${formattedInteger}.${decimalPart}`

    case "space":
      // 1 234.56
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      return `${formattedInteger}.${decimalPart}`

    case "period":
      // 1.234,56
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      return `${formattedInteger},${decimalPart}`

    default:
      return numValue.toFixed(2)
  }
}

// Date formatting
export function formatDate(date: Date | string, settings: LocalizationSettings): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return "Invalid Date"
  }

  const day = String(dateObj.getDate()).padStart(2, "0")
  const month = String(dateObj.getMonth() + 1).padStart(2, "0")
  const year = dateObj.getFullYear()

  switch (settings.dateFormat) {
    case "dd/mm/yyyy":
      return `${day}/${month}/${year}`
    case "mm/dd/yyyy":
      return `${month}/${day}/${year}`
    case "yyyy-mm-dd":
      return `${year}-${month}-${day}`
    default:
      return `${day}/${month}/${year}`
  }
}

// Time formatting
export function formatTime(date: Date | string, settings: LocalizationSettings): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return "Invalid Time"
  }

  const hours = dateObj.getHours()
  const minutes = String(dateObj.getMinutes()).padStart(2, "0")

  if (settings.timeFormat === "12h") {
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes} ${period}`
  } else {
    return `${String(hours).padStart(2, "0")}:${minutes}`
  }
}

// DateTime formatting
export function formatDateTime(date: Date | string, settings: LocalizationSettings): string {
  return `${formatDate(date, settings)} ${formatTime(date, settings)}`
}

// Calculate tax amount
export function calculateTax(amount: number, settings: LocalizationSettings): number {
  return (amount * settings.taxRate) / 100
}

// Calculate amount with tax
export function calculateAmountWithTax(amount: number, settings: LocalizationSettings): number {
  return amount + calculateTax(amount, settings)
}

// Format percentage
export function formatPercentage(value: number | string | null | undefined, decimals = 1): string {
  // Convert to number and handle invalid values
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value

  // Handle null, undefined, or NaN
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return "0.0%"
  }

  return `${numValue.toFixed(decimals)}%`
}
