import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

// Get database connection string
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const isNeonDatabase = connectionString.includes("neon.tech") || connectionString.includes("@ep-")
const isLocalDatabase = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")

// Create appropriate database client based on connection type
let sqlClient: any
let pgPool: Pool | null = null

if (isLocalDatabase) {
  console.log("[v0] Using local PostgreSQL connection with optimized settings")
  pgPool = new Pool({
    connectionString,
    max: 10, // Reduced from 20 for better resource management
    idleTimeoutMillis: 60000, // Increased from 30000 to keep connections longer
    connectionTimeoutMillis: 15000, // Increased from 10000 for offline reliability
    statement_timeout: 30000, // 30 second query timeout
  })

  // Create a Neon-compatible interface for the pg Pool
  sqlClient = async (query: string, params?: any[]) => {
    const client = await pgPool!.connect()
    try {
      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }
} else {
  // Use Neon serverless driver for cloud databases
  console.log("[v0] Using Neon serverless connection")
  sqlClient = neon(connectionString)
}

// Export the sql client with a consistent interface
export const sql = sqlClient

// Helper function for retry logic on rate limit errors
export async function executeWithRetry<T>(queryFn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn()
    } catch (error: any) {
      // Check if it's a rate limit error (429) or connection error
      const isRetryableError = error.status === 429 || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT"

      if (isRetryableError && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
        console.log(`[v0] Retrying database query after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error("Max retries exceeded")
}

// Graceful shutdown handler for pg Pool
if (pgPool) {
  process.on("SIGTERM", async () => {
    console.log("[v0] Closing PostgreSQL connection pool")
    await pgPool?.end()
  })
}
