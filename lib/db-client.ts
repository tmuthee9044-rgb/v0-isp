"use server"

import { neon } from "@neondatabase/serverless"

// Get database connection string
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const isNeonDatabase = connectionString.includes("neon.tech") || connectionString.includes("@ep-")
const isLocalDatabase = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")

// Create Neon client (works for both local PostgreSQL and Neon serverless)
console.log(`[v0] Using ${isLocalDatabase ? "local PostgreSQL" : "Neon serverless"} connection`)
export const sql = neon(connectionString, {
  fetchOptions: {
    cache: "no-store",
  },
})

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
