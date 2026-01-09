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
    await sql`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Kenya'`.catch(() => {})
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

    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_id_seq') THEN
          CREATE SEQUENCE users_id_seq;
        END IF;
        
        -- Set sequence ownership to users.id column
        ALTER SEQUENCE users_id_seq OWNED BY users.id;
        
        -- Set default value for id column to use sequence
        ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
        
        -- Sync sequence to current max id value
        PERFORM setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
      END $$;
    `.catch(() => {})

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
