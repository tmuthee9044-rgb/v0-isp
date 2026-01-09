"use server"

import { Pool, type PoolClient, type QueryResult } from "pg"

// Singleton pool instance
let pool: Pool | null = null

/**
 * Get PostgreSQL connection string (offline local database only)
 */
function getConnectionString(): string {
  // Priority: LOCAL_DATABASE_URL > DATABASE_URL > Default local connection
  return (
    process.env.LOCAL_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `postgresql://isp_admin:SecurePass123!@127.0.0.1:5432/isp_system`
  )
}

/**
 * Log database activity to logs
 */
function logActivity(action: string, details: any) {
  const timestamp = new Date().toISOString()
  console.log(`[DB ${timestamp}] ${action}:`, JSON.stringify(details))
}

/**
 * Get PostgreSQL connection pool
 * Single offline PostgreSQL database only (Rule 4)
 */
export function getPool(): Pool {
  if (pool) {
    return pool
  }

  const connectionString = getConnectionString()

  logActivity("INITIALIZING", {
    type: "PostgreSQL (Offline)",
    host: connectionString.includes("127.0.0.1") ? "127.0.0.1" : "custom",
  })

  pool = new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout after 10 seconds
  })

  // Log pool errors
  pool.on("error", (err) => {
    logActivity("POOL_ERROR", { error: err.message })
    console.error("Unexpected error on idle PostgreSQL client", err)
  })

  logActivity("CONNECTED", {
    type: "PostgreSQL (Offline)",
    status: "success",
  })

  return pool
}

/**
 * SQL tagged template function for PostgreSQL
 * Compatible with Neon's tagged template syntax
 */
export async function getSql() {
  const pool = getPool()

  // Return a function that accepts tagged template literals
  return async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
    // Build the query with $1, $2, etc. placeholders
    let query = strings[0]
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}${strings[i + 1]}`
    }

    logActivity("QUERY", { query: query.substring(0, 100) + "..." })

    try {
      const result: QueryResult = await pool.query(query, values)
      return result.rows
    } catch (error: any) {
      logActivity("QUERY_ERROR", { error: error.message, query })
      throw error
    }
  }
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = getPool()

  logActivity("EXECUTE_QUERY", { query: query.substring(0, 100) + "..." })

  try {
    const result: QueryResult = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logActivity("EXECUTE_ERROR", { error: error.message, query })
    throw error
  }
}

/**
 * Get a database client for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return await pool.connect()
}

/**
 * Get database status
 */
export async function getDatabaseStatus() {
  try {
    const pool = getPool()
    const result = await pool.query("SELECT current_database() as db, version() as version")

    return {
      connected: true,
      database: result.rows[0]?.db,
      version: result.rows[0]?.version,
      type: "PostgreSQL (Offline)",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
      type: "PostgreSQL (Offline)",
    }
  }
}

/**
 * Close all database connections (for graceful shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    logActivity("POOL_CLOSED", { status: "success" })
  }
}

// Export aliases for compatibility
export default getSql
export const getSqlConnection = getSql
export const sql = getSql
export const db = getSql
export { getPool as getDatabase }
