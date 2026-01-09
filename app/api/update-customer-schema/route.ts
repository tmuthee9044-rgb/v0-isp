import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Starting customer schema update...")

    const alterQueries = [
      // Basic Information fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255)`,

      // Business/Tax Information fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_pin VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_reg_no VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS school_type VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS student_count INTEGER`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS staff_count INTEGER`,

      // Address Information fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_country VARCHAR(100) DEFAULT 'kenya'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_lat DECIMAL(10, 8)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_lng DECIMAL(11, 8)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_county VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100) DEFAULT 'kenya'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_lat DECIMAL(10, 8)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_lng DECIMAL(11, 8)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS same_as_physical BOOLEAN DEFAULT false`,

      // Service Configuration fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT true`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true`,

      // Technical Requirements fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS equipment_needed VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_notes TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact VARCHAR(255)`,

      // Additional Information fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_manager VARCHAR(255)`,
    ]

    // Execute all ALTER TABLE queries
    for (const query of alterQueries) {
      await sql(query)
      console.log("[v0] Executed:", query.substring(0, 80) + "...")
    }

    await sql(`
      CREATE TABLE IF NOT EXISTS customer_phone_numbers (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        phone_type VARCHAR(20) DEFAULT 'mobile',
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await sql(`
      CREATE TABLE IF NOT EXISTS customer_emergency_contacts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        relationship VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_physical_city ON customers(physical_city)`,
      `CREATE INDEX IF NOT EXISTS idx_phone_numbers_customer_id ON customer_phone_numbers(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_emergency_contacts_customer_id ON customer_emergency_contacts(customer_id)`,
    ]

    for (const query of indexQueries) {
      await sql(query)
    }

    console.log("[v0] Customer schema update completed successfully")

    return Response.json({
      success: true,
      message: "Customer database schema updated successfully",
      tablesUpdated: ["customers", "customer_phone_numbers", "customer_emergency_contacts"],
      fieldsAdded: alterQueries.length,
      indexesCreated: indexQueries.length,
    })
  } catch (error) {
    console.error("[v0] Error updating customer schema:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
