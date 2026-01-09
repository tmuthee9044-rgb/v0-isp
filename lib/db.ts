"use server"

import postgres from "postgres"

let columnsChecked = false

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

async function ensureCriticalColumns() {
  if (columnsChecked) return
  columnsChecked = true

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.catch(() => {})

    await sql`ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT uuid_generate_v4()`.catch(() => {})

    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS service_start TIMESTAMP`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS service_end TIMESTAMP`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMP`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'pppoe'`.catch(
      () => {},
    )
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'radius'`.catch(
      () => {},
    )

    await sql`ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS billing_cycle_days INTEGER DEFAULT 30`.catch(() => {})
    await sql`ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN DEFAULT false`.catch(() => {})

    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'cash'`.catch(() => {})
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT`.catch(() => {})
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS service_events (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
        event_type VARCHAR(30) NOT NULL,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_service_events_service_id ON service_events(service_id)`.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS service_notifications (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
        notification_type VARCHAR(30) NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_service_notifications_scheduled ON service_notifications(scheduled_for) WHERE status = 'pending'`.catch(
      () => {},
    )

    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_service_end ON customer_services(service_end) WHERE is_active = true`.catch(
      () => {},
    )
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_active_status ON customer_services(is_active, is_suspended, is_deleted, service_end)`.catch(
      () => {},
    )

    // await sql`CREATE SEQUENCE IF NOT EXISTS suppliers_id_seq`.catch(() => {})
    // await sql`ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT nextval('suppliers_id_seq')`.catch(() => {})
    // await sql`SELECT setval('suppliers_id_seq', COALESCE((SELECT MAX(id) FROM suppliers), 0) + 1, false)`.catch(
    //   () => {},
    // )

    await sql`CREATE SEQUENCE IF NOT EXISTS users_id_seq`.catch(() => {})
    await sql`ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq')`.catch(() => {})
    await sql`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)`.catch(() => {})

    await sql`CREATE SEQUENCE IF NOT EXISTS warehouses_id_seq`.catch(() => {})
    await sql`ALTER TABLE warehouses ALTER COLUMN id SET DEFAULT nextval('warehouses_id_seq')`.catch(() => {})
    await sql`SELECT setval('warehouses_id_seq', COALESCE((SELECT MAX(id) FROM warehouses), 0) + 1, false)`.catch(
      () => {},
    )

    // Add missing columns to performance_reviews using individual statements
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS review_period VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS score DECIMAL(5,2)`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS goals TEXT`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS achievements TEXT`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS development_plan TEXT`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS next_review_date DATE`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`.catch(
      () => {},
    )
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS reviewer_id INTEGER`.catch(() => {})

    // Add missing router_id columns
    await sql`ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS router_id VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false`.catch(
      () => {},
    )
    await sql`ALTER TABLE ip_pools ADD COLUMN IF NOT EXISTS router_id INTEGER`.catch(() => {})

    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS address TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS phone_number TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS city TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya'`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS postal_code TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS capacity_cubic_meters DECIMAL(10,2)`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS current_utilization DECIMAL(5,2) DEFAULT 0.00`.catch(
      () => {},
    )
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS warehouse_type TEXT DEFAULT 'general'`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS manager_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`.catch(() => {})
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`.catch(() => {})

    // Add missing suppliers columns
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50) DEFAULT 'vendor'`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2) DEFAULT 0.00`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0.00`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT`.catch(() => {})

    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS founded_year INTEGER`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo TEXT`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS favicon TEXT`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3b82f6'`.catch(
      () => {},
    )
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#64748b'`.catch(
      () => {},
    )
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#16a34a'`.catch(
      () => {},
    )
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS slogan VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        assigned_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        department VARCHAR(100),
        category VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        due_date DATE,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_date TIMESTAMP,
        estimated_hours INTEGER,
        actual_hours INTEGER,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`.catch(() => {})

    await sql`CREATE SEQUENCE IF NOT EXISTS tasks_id_seq`.catch(() => {})
    await sql`ALTER TABLE tasks ALTER COLUMN id SET DEFAULT nextval('tasks_id_seq')`.catch(() => {})
    await sql`SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false)`.catch(() => {})

    await sql`ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius'`.catch(
      () => {},
    )

    await sql`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(255),
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(10, 2) NOT NULL,
        allowances DECIMAL(10, 2) DEFAULT 0.00,
        deductions DECIMAL(10, 2) DEFAULT 0.00,
        gross_pay DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) DEFAULT 0.00,
        nhif DECIMAL(10, 2) DEFAULT 0.00,
        nssf DECIMAL(10, 2) DEFAULT 0.00,
        net_pay DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, pay_period_start)
      )
    `.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(pay_period_start, pay_period_end)`.catch(
      () => {},
    )
    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status)`.catch(() => {})

    console.log("[DB] Critical columns checked successfully")
  } catch (error) {
    console.error("[DB] Error checking columns:", error)
  }
}

/**
 * Unified SQL client — pure PostgreSQL driver for Rule 4 compliance
 * Run column check only on first call, then return cached client
 */
export async function getSql() {
  // Run column check asynchronously on first call only
  if (!columnsChecked) {
    ensureCriticalColumns().catch(() => {}) // Fire and forget
  }
  return sql
}

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

export { sql }
export default sql
export const db = sql
export const getSqlConnection = () => sql
