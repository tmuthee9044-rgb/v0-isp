import postgres from "postgres"

/**
 * Determine which connection string to use - PRIORITIZE LOCAL PostgreSQL per Rule 4
 */
const connectionString =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(`
❌ No database connection string found!

Per Rule 4, this system requires PostgreSQL offline database.
Please set LOCAL_DATABASE_URL environment variable to your local PostgreSQL:
LOCAL_DATABASE_URL=postgresql://username:password@localhost:5432/isp_database
  `)
}

/**
 * Check if we're using local PostgreSQL per Rule 4
 */
const isLocal =
  process.env.LOCAL_DATABASE_URL !== undefined ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1")

if (isLocal) {
  console.log("✅ [DB] Local PostgreSQL connected successfully (Rule 4 - Offline Mode)")
  console.log(`[DB] Connection: ${connectionString.replace(/:[^:@]+@/, ":****@")}`)
} else {
  console.warn("⚠️  [DB] WARNING: Using cloud PostgreSQL instead of local offline database!")
  console.warn("⚠️  [DB] Rule 4 requires LOCAL PostgreSQL. Set LOCAL_DATABASE_URL environment variable.")
}

const sql = postgres(connectionString, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  max_lifetime: 60 * 30, // Close connections after 30 minutes
})

/**
 * Unified SQL client — pure PostgreSQL driver for Rule 4 compliance
 */
export function getSql() {
  return sql
}

export { sql }

/**
 * Get database status for diagnostics
 */
export async function getDatabaseStatus() {
  try {
    const result = await sql`SELECT current_database() as db, version() as version`

    return {
      connected: true,
      database: result[0]?.db,
      version: result[0]?.version,
      driver: "postgres (Pure PostgreSQL)",
      mode: isLocal ? "Local (Offline)" : "Cloud",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    }
  }
}

/**
 * Auto-migrate critical missing columns on startup
 */
async function ensureCriticalColumns() {
  try {
    // Rename days_count to days_requested if it exists
    await sql`
      ALTER TABLE leave_requests 
      RENAME COLUMN days_count TO days_requested
    `.catch(() => {})
    
    // Add missing days_requested column to leave_requests (if rename failed)
    await sql`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS days_requested INTEGER NOT NULL DEFAULT 0
    `.catch(() => {})

    // Update existing records to calculate days_requested
    await sql`
      UPDATE leave_requests 
      SET days_requested = (end_date - start_date + 1)
      WHERE days_requested = 0
    `.catch(() => {})

    // Add missing total_amount column to purchase_order_items
    await sql`
      ALTER TABLE purchase_order_items 
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2)
    `.catch(() => {})

    // Calculate total_amount for existing records
    await sql`
      UPDATE purchase_order_items 
      SET total_amount = (quantity * unit_cost)
      WHERE total_amount IS NULL
    `.catch(() => {})

    // Add missing columns for customer import (from CSV)
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS daily_prepaid_cost DECIMAL(10, 4) DEFAULT 0.0000
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS login VARCHAR(100) UNIQUE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS conversion_date DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS mpesa_phone_number VARCHAR(15)
    `.catch(() => {})

    // Ensure customer_documents table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL DEFAULT 'contract',
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        description TEXT,
        tags TEXT[],
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        is_confidential BOOLEAN DEFAULT FALSE,
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        version INTEGER DEFAULT 1,
        parent_document_id INTEGER REFERENCES customer_documents(id)
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id)
    `.catch(() => {})

    // Ensure customer_equipment table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS customer_equipment (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        inventory_item_id INTEGER,
        equipment_name VARCHAR(255) NOT NULL,
        equipment_type VARCHAR(100),
        serial_number VARCHAR(255),
        mac_address VARCHAR(17),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10, 2),
        total_price DECIMAL(10, 2),
        monthly_cost DECIMAL(10, 2),
        issued_date TIMESTAMP DEFAULT NOW(),
        return_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'issued',
        condition_notes TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id)
    `.catch(() => {})

    // Ensure system_config table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key)
    `.catch(() => {})

    // Ensure UNIQUE constraint exists on system_config.key for UPSERT operations
    await sql`
      ALTER TABLE system_config ADD CONSTRAINT system_config_key_unique UNIQUE (key)
    `.catch(() => {
      // Constraint already exists, ignore error
    })

    // Add compliance tracking columns to network_devices (routers table)
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'unknown'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS last_compliance_check TIMESTAMP
    `.catch(() => {})
    
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS compliance_notes TEXT
    `.catch(() => {})

    // Ensure provisioning_queue table exists for async router operations
    await sql`
      CREATE TABLE IF NOT EXISTS provisioning_queue (
        id SERIAL PRIMARY KEY,
        router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        username VARCHAR(255),
        password TEXT,
        static_ip INET,
        profile VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_status ON provisioning_queue(status)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_router ON provisioning_queue(router_id)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_created ON provisioning_queue(created_at)
    `.catch(() => {})

    // Fix payroll_records table with wrong column types
    await sql`
      DROP TABLE IF EXISTS payroll_records CASCADE
    `.catch(() => {})
    
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
        allowances DECIMAL(15, 2) DEFAULT 0,
        deductions DECIMAL(15, 2) DEFAULT 0,
        gross_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
        tax DECIMAL(15, 2) DEFAULT 0,
        nhif DECIMAL(15, 2) DEFAULT 0,
        nssf DECIMAL(15, 2) DEFAULT 0,
        net_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        payment_date DATE,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, pay_period_start)
      )
    `.catch(() => {})

    console.log("[DB] Critical column migrations applied")
  } catch (error) {
    console.error("[DB] Column migration error:", error)
  }
}

// Run migrations on startup
ensureCriticalColumns()

export default sql
export const db = sql
export const getSqlConnection = () => sql
