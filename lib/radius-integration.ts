import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface RadiusUserConfig {
  customerId: number
  serviceId?: number
  username: string
  password: string
  ipAddress?: string
  downloadSpeed?: number
  uploadSpeed?: number
  expiryDate?: Date
  nasId?: number
}

/**
 * Create or update RADIUS user when service is activated
 */
export async function provisionRadiusUser(config: RadiusUserConfig) {
  try {
    const bcrypt = require("bcryptjs")
    const password_hash = await bcrypt.hash(config.password, 10)

    // Check if user exists
    const existing = await sql`
      SELECT id FROM radius_users 
      WHERE customer_id = ${config.customerId}
      LIMIT 1
    `

    if (existing.length > 0) {
      // Update existing user
      await sql`
        UPDATE radius_users
        SET 
          password_hash = ${password_hash},
          service_id = ${config.serviceId || null},
          ip_address = ${config.ipAddress || null},
          download_limit = ${config.downloadSpeed || 10},
          upload_limit = ${config.uploadSpeed || 10},
          expiry_date = ${config.expiryDate || null},
          status = 'active',
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `

      console.log("[v0] Updated RADIUS user:", config.username)
      return { success: true, user_id: existing[0].id }
    } else {
      // Create new user
      const result = await sql`
        INSERT INTO radius_users (
          username, password_hash, customer_id, service_id,
          ip_address, download_limit, upload_limit, expiry_date,
          status, simultaneous_use, created_at, updated_at
        ) VALUES (
          ${config.username}, ${password_hash}, ${config.customerId}, ${config.serviceId || null},
          ${config.ipAddress || null}, ${config.downloadSpeed || 10}, ${config.uploadSpeed || 10}, ${config.expiryDate || null},
          'active', 1, NOW(), NOW()
        )
        RETURNING id
      `

      console.log("[v0] Created RADIUS user:", config.username)
      return { success: true, user_id: result[0].id }
    }
  } catch (error: any) {
    console.error("[v0] Error provisioning RADIUS user:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Suspend RADIUS user (change status but keep account)
 */
export async function suspendRadiusUser(params: {
  customerId: number
  serviceId?: number
  username?: string
  reason: string
}) {
  try {
    await sql`
      UPDATE radius_users
      SET status = 'suspended', updated_at = NOW()
      WHERE customer_id = ${params.customerId}
    `

    // Disconnect active sessions
    const sessions = await sql`
      SELECT acct_session_id FROM radius_sessions_active rsa
      JOIN radius_users ru ON rsa.user_id = ru.id
      WHERE ru.customer_id = ${params.customerId}
    `

    for (const session of sessions) {
      // Archive and remove
      await sql`
        INSERT INTO radius_sessions_archive 
        SELECT *, NOW() as stop_time, ${params.reason} as terminate_cause, NOW() as archived_at
        FROM radius_sessions_active
        WHERE acct_session_id = ${session.acct_session_id}
        ON CONFLICT DO NOTHING
      `

      await sql`
        DELETE FROM radius_sessions_active
        WHERE acct_session_id = ${session.acct_session_id}
      `
    }

    console.log("[v0] Suspended RADIUS user for customer:", params.customerId)
    return { success: true, sessions_disconnected: sessions.length }
  } catch (error: any) {
    console.error("[v0] Error suspending RADIUS user:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove RADIUS user completely
 */
export async function deprovisionRadiusUser(params: {
  customerId: number
  serviceId?: number
  username?: string
  reason: string
}) {
  try {
    // Disconnect active sessions first
    await suspendRadiusUser(params)

    // Delete user
    await sql`
      DELETE FROM radius_users
      WHERE customer_id = ${params.customerId}
    `

    console.log("[v0] Deprovisioned RADIUS user for customer:", params.customerId)
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error deprovisioning RADIUS user:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get customer's active RADIUS sessions
 */
export async function getCustomerRadiusSessions(customer_id: number) {
  try {
    const sessions = await sql`
      SELECT 
        rsa.*,
        ru.username,
        rn.name as router_name,
        EXTRACT(EPOCH FROM (NOW() - rsa.start_time))::INTEGER as duration_seconds,
        (rsa.bytes_in + rsa.bytes_out) as total_bytes
      FROM radius_sessions_active rsa
      JOIN radius_users ru ON rsa.user_id = ru.id
      LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
      WHERE ru.customer_id = ${customer_id}
      ORDER BY rsa.start_time DESC
    `

    return { success: true, sessions }
  } catch (error: any) {
    console.error("[v0] Error getting RADIUS sessions:", error)
    return { success: false, error: error.message, sessions: [] }
  }
}
