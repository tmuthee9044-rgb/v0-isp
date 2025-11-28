"use server"

import { Pool } from "pg"

// Cached database clients
let localSqlClient: any = null
let neonSqlClient: any = null
let pool: Pool | null = null

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
 * Create a Neon-compatible wrapper for local PostgreSQL Pool
 */
function createLocalSqlWrapper(pool: Pool) {
  const wrapper: any = async (strings: TemplateStringsArray | string, ...values: any[]) => {
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
  }

  // Add unsafe method for raw queries
  wrapper.unsafe = async (query: string, params: any[] = []) => {
    const result = await pool.query(query, params)
    return result.rows
  }

  return wrapper
}

/**
 * Unified SQL client — automatically selects local or Neon DB
 */
export async function getSql(): Promise<any> {
  if (localSqlClient) {
    return localSqlClient
  }

  if (neonSqlClient) {
    return neonSqlClient
  }

  const connectionString = getConnectionString()

  try {
    if (isLocalEnvironment()) {
      console.log("🔧 [DB] Using local PostgreSQL connection (Rule 4 - Offline Mode)")
      pool = new Pool({ connectionString })

      await pool.query("SELECT 1 as health_check")
      console.log("✅ [DB] Local PostgreSQL connected successfully")

      localSqlClient = createLocalSqlWrapper(pool)
      return localSqlClient
    } else {
      console.log("☁️ [DB] Using Neon serverless connection (Rule 4 - Online Mode)")
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
