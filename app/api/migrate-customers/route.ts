import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Starting customer table migration...")

    // Add missing columns to customers table
    const migrations = [
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'residential'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0.00`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_quality VARCHAR(20) DEFAULT 'good'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_login_id VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_date DATE`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_payment_date DATE`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT`,
    ]

    // Execute each migration
    for (const migration of migrations) {
      console.log(`Executing: ${migration}`)
      await sql(migration)
    }

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_portal_username ON customers(portal_username)`,
    ]

    for (const index of indexes) {
      console.log(`Creating index: ${index}`)
      await sql(index)
    }

    // Update existing customers with default values
    await sql`
      UPDATE customers 
      SET 
        customer_type = COALESCE(customer_type, 'residential'),
        connection_quality = COALESCE(connection_quality, 'good'),
        balance = COALESCE(balance, 0.00),
        monthly_fee = COALESCE(monthly_fee, 0.00)
      WHERE customer_type IS NULL OR connection_quality IS NULL
    `

    console.log("Migration completed successfully")

    return NextResponse.json({
      success: true,
      message: "Customer table migration completed successfully",
    })
  } catch (error) {
    console.error("Migration failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
