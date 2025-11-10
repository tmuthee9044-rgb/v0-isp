import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

let localPool: Pool | null = null
let neonSql: ReturnType<typeof neon> | null = null

/**
 * Get SQL client with dual database support (Rule 4)
 * Tries Neon serverless first, falls back to local PostgreSQL if offline
 */
export async function getSql() {
  // Try Neon serverless first
  if (process.env.DATABASE_URL) {
    try {
      if (!neonSql) {
        neonSql = neon(process.env.DATABASE_URL)
      }
      return neonSql
    } catch (error) {
      console.error("[v0] Neon connection failed, falling back to local PostgreSQL:", error)
    }
  }

  // Fall back to local PostgreSQL
  if (!localPool) {
    localPool = new Pool({
      host: process.env.PGHOST || "127.0.0.1",
      port: Number.parseInt(process.env.PGPORT || "5432"),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || "isp_system",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  // Return a wrapper that converts Pool query interface to Neon-like tagged template
  return async (strings: TemplateStringsArray, ...values: any[]) => {
    const client = await localPool!.connect()
    try {
      // Convert tagged template to parameterized query
      let query = strings[0]
      const params: any[] = []

      for (let i = 0; i < values.length; i++) {
        params.push(values[i])
        query += `$${i + 1}` + strings[i + 1]
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }
}

/**
 * Close database connections
 */
export async function closeConnections() {
  if (localPool) {
    await localPool.end()
    localPool = null
  }
  neonSql = null
}
