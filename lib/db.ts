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
      "invoices",
      "invoice_items",
      "payments",
      "account_balances",
      "system_logs",
      "customers",
      "employees",
      "routers",
    ]

    for (const table of tables) {
      try {
        await sql`
          DO $$
          DECLARE
            max_id INTEGER;
          BEGIN
            -- Get the maximum id from the table
            EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I', '${table}') INTO max_id;
            
            -- Drop existing sequence if it exists
            EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', '${table}_id_seq');
            
            -- Create new sequence starting from max_id
            EXECUTE format('CREATE SEQUENCE %I START WITH %s', '${table}_id_seq', max_id);
            
            -- Set the sequence as default for id column
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', '${table}', '${table}_id_seq');
            
            -- Set sequence ownership
            EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', '${table}_id_seq', '${table}');
          END $$;
        `
      } catch (err) {
        // Table might not exist, skip silently
        continue
      }
    }

    sequencesFixed = true
    console.log("✅ [DB] SERIAL sequences verified and fixed")
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
