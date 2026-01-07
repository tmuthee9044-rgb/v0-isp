"use server"

import { neon } from "@neondatabase/serverless"

// Cached database clients
let sqlClient: any = null

/**
 * Determine which connection string to use - PRIORITIZE LOCAL PostgreSQL per Rule 4
 */
function getConnectionString(): string {
  // Priority order: LOCAL_DATABASE_URL > DATABASE_URL > other cloud URLs
  const localConnectionString = process.env.LOCAL_DATABASE_URL

  if (localConnectionString) {
    console.log("🔧 [DB] Using LOCAL_DATABASE_URL for offline PostgreSQL (Rule 4)")
    return localConnectionString
  }

  const connectionString =
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

Example for local PostgreSQL:
LOCAL_DATABASE_URL=postgresql://postgres:password@localhost:5432/isp_db
    `)
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
    connectionString.includes("@local") ||
    process.env.USE_LOCAL_DB === "true" ||
    process.env.LOCAL_DATABASE_URL !== undefined
  )
}

/**
 * Unified SQL client — works in all environments including browser runtime
 */
export async function getSql(): Promise<any> {
  if (sqlClient) {
    return sqlClient
  }

  const connectionString = getConnectionString()

  try {
    const isLocal = isLocalEnvironment()

    if (isLocal) {
      console.log("✅ [DB] Local PostgreSQL connected successfully (Rule 4 - Offline Mode)")
      console.log(`[DB] Connection: ${connectionString.replace(/:[^:@]+@/, ":****@")}`)
    } else {
      console.warn("⚠️  [DB] WARNING: Using cloud PostgreSQL instead of local offline database!")
      console.warn("⚠️  [DB] Rule 4 requires LOCAL PostgreSQL. Set LOCAL_DATABASE_URL environment variable.")
    }

    const sql = neon(connectionString)

    // Test connection
    await sql`SELECT 1 as health_check`
    console.log("✅ [DB] Database connection verified")

    sqlClient = sql
    return sqlClient
  } catch (error: any) {
    console.error("[DB] Connection error:", error.message)
    throw new Error(`Failed to connect to PostgreSQL database: ${error.message}`)
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
      driver: "@neondatabase/serverless (compatible with all runtimes)",
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
