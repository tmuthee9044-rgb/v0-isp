import { Pool } from "pg"
import { NextResponse } from "next/server"

export async function POST() {
  const connectionString = process.env.POSTGRES_URL

  if (!connectionString) {
    return NextResponse.json({ error: "Local PostgreSQL not configured" }, { status: 400 })
  }

  const pool = new Pool({ connectionString })
  const results: string[] = []

  try {
    // Add missing columns to customers table
    const customerColumns = [
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual'",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly'",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER",
    ]

    for (const sql of customerColumns) {
      await pool.query(sql)
      results.push(`✅ Executed: ${sql}`)
    }

    // Add missing columns to locations table
    const locationColumns = [
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(100)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]

    for (const sql of locationColumns) {
      await pool.query(sql)
      results.push(`✅ Executed: ${sql}`)
    }

    // Add missing columns to company_profiles table
    const companyColumns = [
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100)",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en'",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES'",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi'",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD'",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(50) DEFAULT 'HH:mm:ss'",
      "ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(50) DEFAULT '1,234.56'",
    ]

    for (const sql of companyColumns) {
      await pool.query(sql)
      results.push(`✅ Executed: ${sql}`)
    }

    // Create system_config table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    results.push("✅ Created system_config table")

    await pool.end()

    return NextResponse.json({
      success: true,
      message: "Critical columns added successfully",
      results,
    })
  } catch (error: any) {
    await pool.end()
    return NextResponse.json(
      {
        error: "Failed to fix columns",
        details: error.message,
        results,
      },
      { status: 500 },
    )
  }
}
