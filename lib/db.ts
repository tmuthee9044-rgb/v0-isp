import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

let sql: any

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  throw new Error("❌ DATABASE_URL is not set in environment variables.")
}

// --- Auto-detect based on host in DATABASE_URL ---
if (dbUrl.includes("neon.tech")) {
  // ✅ Use Neon serverless
  sql = neon(dbUrl)
  console.log("🌐 Connected to Neon Serverless Database")
} else if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
  // ✅ Use local PostgreSQL
  const pool = new Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  // Create Neon-compatible interface for local PostgreSQL
  sql = async (query: string, params?: any[]) => {
    const client = await pool.connect()
    try {
      const result = await client.query(query, params)
      return result.rows
    } catch (error: any) {
      console.error("❌ Database query error:", error.message)
      throw error
    } finally {
      client.release()
    }
  }

  // Add transaction support
  sql.transaction = async (callback: (sql: any) => Promise<any>) => {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const result = await callback(sql)
      await client.query("COMMIT")
      return result
    } catch (error: any) {
      await client.query("ROLLBACK")
      console.error("❌ Transaction error:", error.message)
      throw error
    } finally {
      client.release()
    }
  }

  console.log("💻 Connected to Local PostgreSQL Database")
} else {
  throw new Error(`⚠️ Unknown database host in DATABASE_URL: ${dbUrl}`)
}

// Default export
export default sql

// Named exports for backward compatibility
export { sql }
export const query = sql
export const db = sql
export function getSqlConnection() {
  return sql
}
