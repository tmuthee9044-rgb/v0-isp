"use server"

import { neon } from "@neondatabase/serverless"

// This ensures Rule 4 compliance with dual database support
// Both local PostgreSQL and Neon serverless use the same Neon driver
// Local DB: postgresql://user:pass@127.0.0.1:5432/dbname
// Neon DB: postgresql://user:pass@ep-xxx.neon.tech/dbname

// Database connection cache
let sqlClient: any = null

/**
 * Get the appropriate database connection string
 */
function getConnectionString(): string {
  // Try environment variables in order of preference
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    throw new Error("No database connection string found in environment variables")
  }

  return connectionString
}

/**
 * Get SQL client with automatic database detection
 * Supports both Neon serverless and local PostgreSQL via Neon driver
 * Implements Rule 4: Dual database support
 */
export async function getSql(): Promise<any> {
  if (sqlClient) {
    return sqlClient
  }

  try {
    const connectionString = getConnectionString()

    const client = neon(connectionString, {
      fetchOptions: {
        cache: "no-store",
      },
    })

    // Test connection
    await client`SELECT 1 as health_check`

    console.log("[DB] Connected successfully")

    sqlClient = client
    return client
  } catch (error: any) {
    console.error("[DB] Connection error:", error.message)
    throw new Error(`Failed to connect to database: ${error.message}`)
  }
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
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    }
  }
}

export default getSql

export const getSqlConnection = getSql
export const sql = getSql
export const db = getSql
