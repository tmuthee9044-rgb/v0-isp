"use server"

import { neon as createNeonClient, type NeonQueryFunction } from "@neondatabase/serverless"

// Cache for database clients
const clientCache = new Map<string, any>()

// Database connection status
const currentDatabaseType: "neon" | "postgresql" | "unknown" = "unknown"
const connectionAttempts = 0
const MAX_RETRY_ATTEMPTS = 3

/**
 * Simple environment detection based on environment variables only
 */
function isLocalEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.LOCAL_DEV === "true" || process.env.USE_LOCAL_DB === "true"
  )
}

/**
 * Get the appropriate database connection string
 */
function getConnectionString(): string {
  const isLocal = isLocalEnvironment()

  // Local PostgreSQL configuration (static credentials for 127.0.0.1)
  const localConnectionString =
    process.env.LOCAL_DATABASE_URL || `postgresql://isp_admin:SecurePass123!@127.0.0.1:5432/isp_system`

  // Neon serverless configuration
  const neonConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL

  // Priority logic based on environment
  if (isLocal) {
    // Development: Try local first, fallback to Neon
    return localConnectionString
  } else {
    // Production: Use Neon
    return neonConnectionString || localConnectionString
  }
}

/**
 * Log database activity
 */
function logActivity(action: string, details: any) {
  const timestamp = new Date().toISOString()
  console.log(`[DB ${timestamp}] ${action}:`, JSON.stringify(details))
}

// Singleton SQL client
let sqlClient: NeonQueryFunction<false, false> | null = null
let initializationPromise: Promise<NeonQueryFunction<false, false>> | null = null

/**
 * Get SQL client with automatic database detection
 * Supports both Neon serverless and local PostgreSQL
 */
export async function getSql(): Promise<NeonQueryFunction<false, false>> {
  if (sqlClient) {
    return sqlClient
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    const connectionString = getConnectionString()
    const isLocal = connectionString.includes("127.0.0.1") || connectionString.includes("localhost")

    logActivity("INITIALIZING", {
      type: isLocal ? "PostgreSQL (Local)" : "Neon Serverless",
      environment: isLocalEnvironment() ? "development" : "production",
    })

    try {
      const client = createNeonClient(connectionString, {
        fetchOptions: {
          cache: "no-store",
        },
      })

      // Test connection
      await client`SELECT 1 as health_check`

      logActivity("CONNECTED", {
        type: isLocal ? "PostgreSQL (Local)" : "Neon Serverless",
        status: "success",
      })

      sqlClient = client
      return client
    } catch (error: any) {
      logActivity("CONNECTION_ERROR", {
        error: error.message,
        attempted: isLocal ? "local" : "neon",
      })

      // Fallback logic
      if (isLocal && process.env.DATABASE_URL) {
        logActivity("FALLBACK", { from: "local", to: "neon" })
        const fallbackString = process.env.DATABASE_URL
        const fallbackClient = createNeonClient(fallbackString)
        await fallbackClient`SELECT 1 as health_check`
        sqlClient = fallbackClient
        return fallbackClient
      } else if (!isLocal) {
        logActivity("FALLBACK", { from: "neon", to: "local" })
        const fallbackString = `postgresql://isp_admin:SecurePass123!@127.0.0.1:5432/isp_system`
        const fallbackClient = createNeonClient(fallbackString)
        await fallbackClient`SELECT 1 as health_check`
        sqlClient = fallbackClient
        return fallbackClient
      }

      throw new Error(`Error connecting to database: ${error.message}`)
    } finally {
      initializationPromise = null
    }
  })()

  return initializationPromise
}

/**
 * Get database status
 */
export async function getDatabaseStatus() {
  try {
    const sql = await getSql()
    const result = await sql`SELECT current_database() as db, version() as version`

    return {
      connected: true,
      database: result[0]?.db,
      version: result[0]?.version,
      environment: isLocalEnvironment() ? "development" : "production",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
      environment: isLocalEnvironment() ? "development" : "production",
    }
  }
}

export default getSql

export const getSqlConnection = getSql
export { getSql as sql, getSql as db }
