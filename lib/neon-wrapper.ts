"use server"

import { neon as neonOriginal, type NeonQueryFunction } from "@neondatabase/serverless"

// Cache for database clients
const clientCache = new Map<string, any>()

/**
 * Smart neon() wrapper that works with both local PostgreSQL and Neon serverless
 * The Neon client can connect to any PostgreSQL database, not just Neon
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

  const dbType = isLocalDatabase ? "local PostgreSQL" : "Neon serverless"
  console.log(`[v0] Connecting to ${dbType}`)

  // Use Neon client for both local and remote databases
  // The Neon client is compatible with any PostgreSQL database
  const client = neonOriginal(connectionString, {
    ...options,
    fetchOptions: {
      cache: "no-store",
      ...options?.fetchOptions,
    },
  })

  clientCache.set(connectionString, client)
  return client
}

export * from "@neondatabase/serverless"

export default { neon }
