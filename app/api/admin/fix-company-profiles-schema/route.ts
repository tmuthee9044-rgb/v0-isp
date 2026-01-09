import { NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST() {
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING,
  })

  try {
    // Add missing columns to company_profiles table in local PostgreSQL
    const alterStatements = [
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Africa/Nairobi'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(50) DEFAULT 'comma'`,
      `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(20) DEFAULT 'Monday'`,
    ]

    for (const statement of alterStatements) {
      await localPool.query(statement)
    }

    await localPool.end()

    return NextResponse.json({
      success: true,
      message: "company_profiles table schema fixed successfully",
    })
  } catch (error) {
    console.error("Error fixing company_profiles schema:", error)
    await localPool.end()
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
