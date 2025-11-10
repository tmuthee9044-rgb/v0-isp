/**
 * Database Health Monitoring System
 * Continuously monitors both Neon and PostgreSQL databases
 * Provides automatic failover and health status
 */

import { getDatabaseStatus } from "./db"

interface HealthStatus {
  timestamp: string
  neonAvailable: boolean
  postgresqlAvailable: boolean
  activeDatabase: "neon" | "postgresql" | "none"
  environment: "development" | "production"
  responseTime: number
  lastError?: string
}

const healthHistory: HealthStatus[] = []
const MAX_HISTORY = 100

/**
 * Check health of both databases
 */
export async function checkDatabaseHealth(): Promise<HealthStatus> {
  const startTime = Date.now()

  try {
    const status = await getDatabaseStatus()
    const responseTime = Date.now() - startTime

    const health: HealthStatus = {
      timestamp: new Date().toISOString(),
      neonAvailable: status.type === "neon" && status.connected,
      postgresqlAvailable: status.type === "postgresql" && status.connected,
      activeDatabase: status.connected ? status.type : "none",
      environment: status.environment as "development" | "production",
      responseTime,
      lastError: status.error,
    }

    // Store in history
    healthHistory.push(health)
    if (healthHistory.length > MAX_HISTORY) {
      healthHistory.shift()
    }

    console.log(`[Health Check] Database: ${health.activeDatabase}, Response: ${health.responseTime}ms`)

    return health
  } catch (error: any) {
    const health: HealthStatus = {
      timestamp: new Date().toISOString(),
      neonAvailable: false,
      postgresqlAvailable: false,
      activeDatabase: "none",
      environment: process.env.NODE_ENV === "development" ? "development" : "production",
      responseTime: Date.now() - startTime,
      lastError: error.message,
    }

    healthHistory.push(health)
    if (healthHistory.length > MAX_HISTORY) {
      healthHistory.shift()
    }

    console.error(`[Health Check] Failed: ${error.message}`)

    return health
  }
}

/**
 * Get health history
 */
export function getHealthHistory(): HealthStatus[] {
  return [...healthHistory]
}

/**
 * Get current health metrics
 */
export function getHealthMetrics() {
  if (healthHistory.length === 0) {
    return {
      averageResponseTime: 0,
      uptime: 0,
      totalChecks: 0,
      failedChecks: 0,
      currentDatabase: "unknown",
    }
  }

  const totalResponseTime = healthHistory.reduce((sum, h) => sum + h.responseTime, 0)
  const failedChecks = healthHistory.filter((h) => h.activeDatabase === "none").length
  const latestHealth = healthHistory[healthHistory.length - 1]

  return {
    averageResponseTime: Math.round(totalResponseTime / healthHistory.length),
    uptime: Math.round(((healthHistory.length - failedChecks) / healthHistory.length) * 100),
    totalChecks: healthHistory.length,
    failedChecks,
    currentDatabase: latestHealth.activeDatabase,
    environment: latestHealth.environment,
  }
}

if (typeof window === "undefined") {
  // Initial health check
  checkDatabaseHealth().catch(console.error)

  // Periodic health checks
  setInterval(() => {
    checkDatabaseHealth().catch(console.error)
  }, 60000)
}
