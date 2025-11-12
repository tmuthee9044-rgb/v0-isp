"use server"

import { neon } from "@neondatabase/serverless"
import { Pool } from "pg" // Used only for local PostgreSQL

// Cached database client
let sqlClient: any = null

/**
 * Determine which connection string to use.
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
 * - localhost / 127.0.0.1 / NODE_ENV === development → local PostgreSQL
 * - anything else → Neon serverless
 */
function isLocalEnvironment(): boolean {
  const host = process.env.HOST || ""
  return (
    process.env.NODE_ENV === "development" ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    process.env.USE_LOCAL_DB === "true"
  )
}

/**
 * Unified SQL client — automatically selects local or Neon DB
 */
export async function getSql(): Promise<any> {
  if (sqlClient) return sqlClient

  const connectionString = getConnectionString()

  try {
    if (isLocalEnvironment()) {
      console.log("[DB] Using local PostgreSQL database")

      // Create and test local Pool connection
      const pool = new Pool({ connectionString })

      await pool.query("SELECT 1 as health_check")

      console.log("[DB] Local PostgreSQL connected successfully")

      sqlClient = async (query: string, params?: any[]) => {
        const result = await pool.query(query, params)
        return result.rows
      }
    } else {
      console.log("[DB] Using Neon serverless database")

      const neonClient = neon(connectionString)

      // Test Neon connection
      await neonClient`SELECT 1 as health_check`

      console.log("[DB] Neon serverless connected successfully")

      sqlClient = neonClient
    }

    return sqlClient
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
