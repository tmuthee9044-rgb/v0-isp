"use server"

import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

// Cached database client
let sqlClient: any = null
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
  // Check if connection string points to localhost
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
  if (sqlClient) {
    return sqlClient
  }

  const connectionString = getConnectionString()

  try {
    if (isLocalEnvironment()) {
      pool = new Pool({ connectionString })

      // Test connection
      await pool.query("SELECT 1 as health_check")

      sqlClient = createLocalSqlWrapper(pool)
    } else {
      const neonClient = neon(connectionString)

      // Test connection
      await neonClient`SELECT 1 as health_check`

      sqlClient = neonClient
    }

    return sqlClient
  } catch (error: any) {
    console.error("[DB] Failed to connect to database:", error.message)
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
