import { getSql } from "@/lib/db"
import { sql, executeWithRetry } from "./db-client"

class DatabasePool {
  private static instance: DatabasePool

  private constructor() {
    console.log("[v0] DatabasePool initialized - using getSql() for dual database support")
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
    }
    return DatabasePool.instance
  }

  async getConnection() {
    return await getSql()
  }
}

export { sql, executeWithRetry }
// Export the class for advanced usage
export { DatabasePool }
