import { NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log("[v0] Starting company_profiles table schema fix...")

    // Add all missing columns to company_profiles table
    const alterStatements = [
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS founded_year INTEGER`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Africa/Nairobi'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(50) DEFAULT '24h'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(50) DEFAULT '1,234.56'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'monday'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS website VARCHAR(255)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS address TEXT`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya'`,
    ]

    const results = []
    for (const statement of alterStatements) {
      try {
        await pool.query(statement)
        const columnName = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1]
        results.push({ column: columnName, status: "added" })
        console.log(`[v0] Added column: ${columnName}`)
      } catch (error: any) {
        const columnName = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1]
        results.push({ column: columnName, status: "error", error: error.message })
        console.error(`[v0] Error adding column ${columnName}:`, error.message)
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      message: "company_profiles table schema updated successfully",
      results,
    })
  } catch (error: any) {
    await pool.end()
    console.error("[v0] Error fixing company_profiles schema:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
