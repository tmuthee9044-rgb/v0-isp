"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface LocalizationSettings {
  language: string
  currency: string
  timezone: string
  dateFormat: string
  timeFormat: string
  numberFormat: string
  weekStart: string
  companyPrefix: string
  taxSystem: string
  taxRate: number
}

interface LocalizationContextType {
  settings: LocalizationSettings
  isLoading: boolean
  refreshSettings: () => Promise<void>
}

const defaultSettings: LocalizationSettings = {
  language: "en",
  currency: "kes",
  timezone: "eat",
  dateFormat: "dd/mm/yyyy",
  timeFormat: "24h",
  numberFormat: "comma",
  weekStart: "monday",
  companyPrefix: "TW",
  taxSystem: "vat",
  taxRate: 16,
}

const LocalizationContext = createContext<LocalizationContextType>({
  settings: defaultSettings,
  isLoading: true,
  refreshSettings: async () => {},
})

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocalizationSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/localization")
      if (response.ok) {
        const data = await response.json()
        setSettings({
          language: data.localization_language || defaultSettings.language,
          currency: data.localization_currency || defaultSettings.currency,
          timezone: data.localization_timezone || defaultSettings.timezone,
          dateFormat: data.localization_date_format || defaultSettings.dateFormat,
          timeFormat: data.localization_time_format || defaultSettings.timeFormat,
          numberFormat: data.localization_number_format || defaultSettings.numberFormat,
          weekStart: data.localization_week_start || defaultSettings.weekStart,
          companyPrefix: data.company_prefix || defaultSettings.companyPrefix,
          taxSystem: data.tax_system || defaultSettings.taxSystem,
          taxRate: Number.parseFloat(data.tax_rate) || defaultSettings.taxRate,
        })
      }
    } catch (error) {
      console.error("[v0] Failed to load localization settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const refreshSettings = async () => {
    setIsLoading(true)
    await fetchSettings()
  }

  return (
    <LocalizationContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useLocalization() {
  const context = useContext(LocalizationContext)
  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider")
  }
  return context
}
