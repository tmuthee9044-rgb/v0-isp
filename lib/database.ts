import { neon } from "@neondatabase/serverless"
import { sql, executeWithRetry } from "./db-client"

class DatabasePool {
  private static instance: DatabasePool
  private pool: any

  private constructor() {
    console.log("[v0] Initializing database connection pool...")

    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.NEON_DATABASE_URL

    if (!connectionString) {
      throw new Error("No database connection string found in environment variables")
    }

    // Create a single connection instance that will be reused
    this.pool = neon(connectionString, {
      // Configure connection pooling options
      poolConfig: {
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        max: 20, // Maximum pool size
        min: 2, // Minimum pool size
      },
    })

    console.log("[v0] Database connection pool initialized successfully")
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
    }
    return DatabasePool.instance
  }

  getConnection() {
    return this.pool
  }
}

export { sql, executeWithRetry }
// Export the class for advanced usage
export { DatabasePool }
