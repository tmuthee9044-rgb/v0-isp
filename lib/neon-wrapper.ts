import { neon as neonOriginal, type NeonQueryFunction } from "@neondatabase/serverless"
import { Pool, type PoolConfig } from "pg"

// Cache for database clients
const clientCache = new Map<string, any>()
const poolCache = new Map<string, Pool>()

/**
 * Smart neon() wrapper that automatically detects local vs cloud PostgreSQL
 * and uses the appropriate driver for optimal performance
 */
export function neon(connectionString: string, options?: any): NeonQueryFunction<false, false> {
  // Check cache first
  if (clientCache.has(connectionString)) {
    return clientCache.get(connectionString)
  }

  const isLocalDatabase =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("@localhost") ||
    connectionString.includes("@127.0.0.1")

  if (isLocalDatabase) {
    // Use standard pg Pool for local/offline PostgreSQL
    console.log("[v0] Using local PostgreSQL connection (pg driver)")

    // Get or create pool for this connection string
    let pool = poolCache.get(connectionString)
    if (!pool) {
      const poolConfig: PoolConfig = {
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
      }
      pool = new Pool(poolConfig)
      poolCache.set(connectionString, pool)

      // Graceful shutdown
      process.on("SIGTERM", async () => {
        await pool?.end()
      })
    }

    // Create Neon-compatible interface
    const sqlClient: any = async (query: string, params?: any[]) => {
      const client = await pool!.connect()
      try {
        const result = await client.query(query, params)
        return result.rows
      } catch (error: any) {
        console.error("[v0] Database query error:", error.message)
        throw error
      } finally {
        client.release()
      }
    }

    // Add Neon-compatible methods
    sqlClient.unsafe = async (query: string) => {
      const client = await pool!.connect()
      try {
        const result = await client.query(query)
        return result.rows
      } catch (error: any) {
        console.error("[v0] Database unsafe query error:", error.message)
        throw error
      } finally {
        client.release()
      }
    }

    sqlClient.transaction = async (callback: (sql: any) => Promise<any>) => {
      const client = await pool!.connect()
      try {
        await client.query("BEGIN")
        const result = await callback(sqlClient)
        await client.query("COMMIT")
        return result
      } catch (error: any) {
        await client.query("ROLLBACK")
        console.error("[v0] Transaction error:", error.message)
        throw error
      } finally {
        client.release()
      }
    }

    clientCache.set(connectionString, sqlClient)
    return sqlClient as NeonQueryFunction<false, false>
  } else {
    // Use Neon serverless driver for cloud databases
    console.log("[v0] Using Neon serverless connection")
    const client = neonOriginal(connectionString, options)
    clientCache.set(connectionString, client)
    return client
  }
}

export * from "@neondatabase/serverless"

export default { neon }
