import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

// Rule 4: System uses both PostgreSQL offline and Neon serverless database
let sqlClient: any = null
let isNeon = false

export async function getSql() {
  // Return cached client if already initialized
  if (sqlClient) {
    return sqlClient
  }

  try {
    // Try Neon serverless first (online)
    if (process.env.DATABASE_URL) {
      const neonSql = neon(process.env.DATABASE_URL)
      // Test the connection
      await neonSql`SELECT 1`
      console.log("[v0] Connected to Neon serverless database")
      sqlClient = neonSql
      isNeon = true
      return sqlClient
    }
  } catch (error) {
    console.log("[v0] Neon connection failed, trying local PostgreSQL...", error)
  }

  try {
    // Fallback to local PostgreSQL (offline)
    const pool = new Pool({
      host: process.env.PGHOST || "127.0.0.1",
      port: Number.parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE || "isp",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
    })

    // Test the connection
    const client = await pool.connect()
    client.release()

    console.log("[v0] Connected to local PostgreSQL database")

    // Create a sql tagged template function compatible with Neon's API
    sqlClient = async (strings: TemplateStringsArray, ...values: any[]) => {
      const client = await pool.connect()
      try {
        let query = strings[0]
        for (let i = 0; i < values.length; i++) {
          query += `$${i + 1}` + strings[i + 1]
        }
        const result = await client.query(query, values)
        return result.rows
      } finally {
        client.release()
      }
    }

    isNeon = false
    return sqlClient
  } catch (error) {
    console.error("[v0] Failed to connect to any database:", error)
    throw new Error("Database connection failed. Please check your DATABASE_URL or local PostgreSQL configuration.")
  }
}

export function isDatabaseNeon() {
  return isNeon
}
