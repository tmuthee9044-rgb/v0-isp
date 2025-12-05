"use client"

import * as React from "react"

export interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  React.useEffect(() => {
    // Simple theme setup for preview environment
    const root = window.document.documentElement
    if (defaultTheme === "dark") {
      root.classList.add("dark")
    } else if (defaultTheme === "light") {
      root.classList.remove("dark")
    } else {
      // system
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (isDark) {
        root.classList.add("dark")
      }
    }
  }, [defaultTheme])

  return <>{children}</>
}
