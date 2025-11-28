"use server"

import { Pool } from "pg"

// Cached database clients
let localSqlClient: any = null
let neonSqlClient: any = null
let pool: Pool | null = null
const useNeonFallback = false

/**
 * Determine which connection string to use
 */
function getConnectionString(): string {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    throw new Error("❌ No database connection string found in environment variables")
  }

  return connectionString
}

/**
 * Detects if we are running locally or in production
 */
function isLocalEnvironment(): boolean {
  const connectionString = getConnectionString()
  return (
    process.env.NODE_ENV === "development" ||
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    process.env.USE_LOCAL_DB === "true"
  )
}

/**
 * Create a Neon-compatible wrapper for local PostgreSQL Pool with auto-fallback
 */
function createLocalSqlWrapper(pool: Pool) {
  const wrapper: any = async (strings: TemplateStringsArray | string, ...values: any[]) => {
    try {
      if (typeof strings === "string") {
        // Called as sql.unsafe(query)
        const result = await pool.query(strings)
        return result.rows
      } else {
        // Called as sql`query ${value}`
        let query = ""
        for (let i = 0; i < strings.length; i++) {
          query += strings[i]
          if (i < values.length) {
            query += `$${i + 1}`
          }
        }
        const result = await pool.query(query, values)
        return result.rows
      }
    } catch (error: any) {
      if (error.code === "42703" || error.code === "42P01" || error.message.includes("does not exist")) {
        console.warn(`⚠️ [DB] Schema error in local PostgreSQL: ${error.message}`)
        console.log("🔄 [DB] Falling back to Neon serverless...")

        // Get Neon client and retry query
        const neonClient = await getNeonClient()

        if (typeof strings === "string") {
          const result = await neonClient.unsafe(strings)
          return result
        } else {
          // For tagged templates, use Neon directly
          return await neonClient(strings, ...values)
        }
      }
      throw error
    }
  }

  // Add unsafe method for raw queries with fallback
  wrapper.unsafe = async (query: string, params: any[] = []) => {
    try {
      const result = await pool.query(query, params)
      return result.rows
    } catch (error: any) {
      if (error.code === "42703" || error.code === "42P01" || error.message.includes("does not exist")) {
        console.warn(`⚠️ [DB] Schema error in local PostgreSQL: ${error.message}`)
        console.log("🔄 [DB] Falling back to Neon serverless...")

        const neonClient = await getNeonClient()
        return await neonClient.unsafe(query, params)
      }
      throw error
    }
  }

  return wrapper
}

/**
 * Ensure critical tables exist in local database
 */
async function ensureLocalTables(pool: Pool) {
  try {
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'locations'
      );
    `)

    if (!checkTable.rows[0].exists) {
      console.log("⚙️ [DB] Creating missing tables in local database...")

      // Create locations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          address TEXT,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          parent_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Create indexes separately
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);`)

      console.log("✅ [DB] Missing tables created successfully")
    }
  } catch (error: any) {
    console.warn("⚠️ [DB] Could not auto-create tables:", error.message)
    // Don't throw - let the application continue with Neon fallback
  }
}

async function getNeonClient() {
  if (neonSqlClient) {
    return neonSqlClient
  }

  const connectionString = getConnectionString()
  console.log("☁️ [DB] Initializing Neon serverless connection for fallback...")

  try {
    const neonModule = await import("@neondatabase/serverless")

    // Try to get the neon function in multiple ways
    const neonFunction = neonModule.neon || neonModule.default

    if (typeof neonFunction !== "function") {
      throw new Error("Failed to load neon function from @neondatabase/serverless")
    }

    neonSqlClient = neonFunction(connectionString)
    console.log("✅ [DB] Neon fallback client created successfully")
    return neonSqlClient
  } catch (error: any) {
    console.error("❌ [DB] Failed to create Neon client:", error.message)
    throw error
  }
}

/**
 * Unified SQL client — automatically selects local or Neon DB
 */
export async function getSql(): Promise<any> {
  if (useNeonFallback && neonSqlClient) {
    return neonSqlClient
  }

  if (localSqlClient) {
    return localSqlClient
  }

  const connectionString = getConnectionString()

  try {
    if (isLocalEnvironment()) {
      console.log("🔧 [DB] Using local PostgreSQL connection with auto-fallback")
      pool = new Pool({ connectionString })

      await pool.query("SELECT 1 as health_check")
      console.log("✅ [DB] Local PostgreSQL connected successfully")

      localSqlClient = createLocalSqlWrapper(pool)
      return localSqlClient
    } else {
      console.log("☁️ [DB] Using Neon serverless connection")
      const { neon } = await import("@neondatabase/serverless")
      const neonClient = neon(connectionString)

      await neonClient`SELECT 1 as health_check`
      console.log("✅ [DB] Neon serverless connected successfully")

      neonSqlClient = neonClient
      return neonClient
    }
  } catch (error: any) {
    console.error("[DB] Connection error:", error.message)
    throw new Error(`Failed to connect to database: ${error.message}`)
  }
}

/**
 * Get database status for diagnostics
 */
export async function getDatabaseStatus() {
  try {
    const sql = await getSql()
    const result = await sql`SELECT current_database() as db, version() as version`

    return {
      connected: true,
      database: result[0]?.db,
      version: result[0]?.version,
      driver: isLocalEnvironment() ? "pg (local)" : "neon (serverless)",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    }
  }
}

export default getSql
export const sql = getSql
export const db = getSql
export const getSqlConnection = getSql
