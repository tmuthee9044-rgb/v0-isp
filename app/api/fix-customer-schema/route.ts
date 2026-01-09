import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Starting comprehensive customer schema update...")

    const alterQueries = [
      // Basic information fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255)`,

      // Business/Tax information
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_pin VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_reg_no VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS school_type VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS student_count INTEGER`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS staff_count INTEGER`,

      // Contact information
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_office VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100)`,

      // Address information
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_gps_coordinates VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_county VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS same_as_physical BOOLEAN DEFAULT true`,

      // Service configuration
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_plan_id INTEGER`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly'`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true`,

      // Technical requirements
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS equipment_needed TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_notes TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact_phone VARCHAR(20)`,

      // Additional information
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_manager VARCHAR(255)`,

      // System fields
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar VARCHAR(500)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS data_usage BIGINT DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS router_allocated BOOLEAN DEFAULT false`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS ip_allocated BOOLEAN DEFAULT false`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS location VARCHAR(255)`,
    ]

    // Execute all ALTER TABLE queries
    for (const query of alterQueries) {
      await sql(query)
      console.log("[v0] Executed:", query.substring(0, 80) + "...")
    }

    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_service_plan_id ON customers(service_plan_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)`,
    ]

    for (const query of indexQueries) {
      await sql(query)
      console.log("[v0] Created index:", query.substring(0, 80) + "...")
    }

    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    if (customerCount[0].count === "0") {
      console.log("[v0] Adding sample customers...")

      await sql`
        INSERT INTO customers (
          name, last_name, email, phone, customer_type, status, 
          physical_address, physical_city, physical_county,
          service_plan_id, monthly_fee, balance, connection_quality,
          created_at, updated_at
        ) VALUES 
        ('John', 'Doe', 'john.doe@email.com', '+254712345678', 'individual', 'active',
         '123 Main Street', 'Nairobi', 'Nairobi', 1, 2500.00, 0.00, 'excellent',
         NOW(), NOW()),
        ('Jane', 'Smith', 'jane.smith@company.com', '+254723456789', 'company', 'active',
         '456 Business Ave', 'Mombasa', 'Mombasa', 2, 5000.00, -1500.00, 'good',
         NOW(), NOW()),
        ('Greenfield', 'Academy', 'admin@greenfield.ac.ke', '+254734567890', 'school', 'pending',
         '789 Education Road', 'Kisumu', 'Kisumu', 3, 10000.00, 2500.00, 'fair',
         NOW(), NOW())
      `
    }

    console.log("[v0] Customer schema update completed successfully")

    return Response.json({
      success: true,
      message: "Customer schema updated successfully with all form fields",
      columnsAdded: alterQueries.length,
      indexesCreated: indexQueries.length,
    })
  } catch (error) {
    console.error("[v0] Database schema update error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
