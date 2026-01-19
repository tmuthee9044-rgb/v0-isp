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
    // Add missing days_requested column to leave_requests
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
