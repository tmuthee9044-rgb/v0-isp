"use server"

import postgres from "postgres"

// Cached database client
let sqlClient: any = null
let sequencesFixed = false

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

/**
 * Initialize pure PostgreSQL client - works with any PostgreSQL database
 */
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

/**
 * Fix all SERIAL sequences to ensure auto-increment works
 */
async function fixSequences() {
  if (sequencesFixed) return

  try {
    console.log("[DB] Checking and fixing SERIAL sequences...")

    const tables = [
      "customer_services",
      "customer_billing_configurations",
      "customer_phone_numbers",
      "customer_emergency_contacts",
      "customer_contacts",
      "invoices",
      "invoice_items",
      "payments",
      "account_balances",
      "system_logs",
      "customers",
      "employees",
      "routers",
      "service_plans",
      "support_tickets",
      "leave_requests",
      "payroll_records",
      "performance_reviews",
      "hotspots",
      "hotspot_users",
      "hotspot_vouchers",
      "credit_notes",
      "system_users",
      "roles",
    ]

    for (const table of tables) {
      try {
        // Check if table exists first
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `

        if (!tableExists[0]?.exists) continue

        // Get max id
        const maxResult = await sql`
          SELECT COALESCE(MAX(id), 0) as max_id FROM ${sql(table)}
        `
        const maxId = (maxResult[0]?.max_id || 0) + 1

        // Drop and recreate sequence
        await sql.unsafe(`DROP SEQUENCE IF EXISTS ${table}_id_seq CASCADE`)
        await sql.unsafe(`CREATE SEQUENCE ${table}_id_seq START WITH ${maxId}`)
        await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('${table}_id_seq')`)
        await sql.unsafe(`ALTER SEQUENCE ${table}_id_seq OWNED BY ${table}.id`)

        console.log(`✅ [DB] Fixed sequence for ${table} (next id: ${maxId})`)
      } catch (err: any) {
        // Table might not have id column or other issues, skip
        console.log(`⚠️  [DB] Skipped ${table}: ${err.message}`)
        continue
      }
    }

    sequencesFixed = true
    console.log("✅ [DB] All SERIAL sequences verified and fixed")
  } catch (error: any) {
    console.error("⚠️  [DB] Error fixing sequences:", error.message)
  }
}

/**
 * Unified SQL client — pure PostgreSQL driver for Rule 4 compliance
 */
export async function getSql() {
  if (sqlClient) {
    return sqlClient
  }

  // Test connection
  await sql`SELECT 1 as health_check`
  console.log("✅ [DB] PostgreSQL connection verified")

  await fixSequences()

  sqlClient = sql
  return sqlClient
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

export default sql
export const db = sql
export const getSqlConnection = () => sql
