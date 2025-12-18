/**
 * RADIUS Integration Library - Clean Version
 * Manages RADIUS user provisioning and session tracking
 * Compatible with PostgreSQL offline and Neon serverless (Rule 4)
 */

import { getSql } from "@/lib/db"

// Type definition for RADIUS user configuration
export interface RadiusUserConfig {
  username: string
  password: string
  customerId: number
  serviceId?: number
  ipAddress?: string
  downloadSpeed?: number
  uploadSpeed?: number
  expiryDate?: string | null
}

/**
 * Create or update RADIUS user when service is activated
 * Enhanced to accept full service plan configuration including all QoS and FUP settings
 */
export async function provisionRadiusUser(config: RadiusUserConfig) {
  try {
    const sql = await getSql()
    const bcrypt = require("bcryptjs")
    const password_hash = await bcrypt.hash(config.password, 10)

    // Fetch service plan details if serviceId is provided
    let servicePlan = null
    if (config.serviceId) {
      const planResult = await sql`
        SELECT 
          speed_download, speed_upload, guaranteed_download, guaranteed_upload,
          burst_download, burst_upload, burst_duration, priority_level,
          fup_enabled, data_limit, fup_speed, action_after_limit,
          qos_enabled, traffic_shaping, bandwidth_allocation,
          static_ip, concurrent_connections
        FROM service_plans sp
        JOIN customer_services cs ON sp.id = cs.service_plan_id
        WHERE cs.id = ${config.serviceId}
        LIMIT 1
      `
      servicePlan = planResult[0] || null
    }

    // Use service plan speeds if available, otherwise use config values
    const downloadSpeed = servicePlan?.speed_download || config.downloadSpeed || 10
    const uploadSpeed = servicePlan?.speed_upload || config.uploadSpeed || 10
    const burstDownload = servicePlan?.burst_download || null
    const burstUpload = servicePlan?.burst_upload || null
    const burstDuration = servicePlan?.burst_duration || 300

    // Check if user exists
    const existing = await sql`
      SELECT id FROM radius_users 
      WHERE customer_id = ${config.customerId}
      LIMIT 1
    `

    if (existing.length > 0) {
      // Update with full service plan configuration
      await sql`
        UPDATE radius_users
        SET 
          password_hash = ${password_hash},
          service_id = ${config.serviceId || null},
          ip_address = ${config.ipAddress || null},
          download_limit = ${downloadSpeed},
          upload_limit = ${uploadSpeed},
          burst_download = ${burstDownload},
          burst_upload = ${burstUpload},
          burst_duration = ${burstDuration},
          priority_level = ${servicePlan?.priority_level || "standard"},
          fup_enabled = ${servicePlan?.fup_enabled || false},
          fup_limit = ${servicePlan?.data_limit || null},
          fup_speed = ${servicePlan?.fup_speed || null},
          simultaneous_use = ${servicePlan?.concurrent_connections || 1},
          expiry_date = ${config.expiryDate || null},
          status = 'active',
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `

      console.log("[v0] Updated RADIUS user with service plan settings:", {
        username: config.username,
        speeds: `${downloadSpeed}/${uploadSpeed}Mbps`,
        burst: burstDownload ? `${burstDownload}/${burstUpload}Mbps` : "disabled",
        fup: servicePlan?.fup_enabled ? "enabled" : "disabled",
      })

      // Log to activity logs for audit trail (Rule 3)
      await sql`
        INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
        VALUES (
          'update', 'radius_user', ${existing[0].id}, 
          ${JSON.stringify({
            customer_id: config.customerId,
            service_id: config.serviceId,
            speeds: { download: downloadSpeed, upload: uploadSpeed },
            features: { fup: servicePlan?.fup_enabled, qos: servicePlan?.qos_enabled },
          })}, 
          CURRENT_TIMESTAMP
        )
      `

      return { success: true, user_id: existing[0].id }
    } else {
      // Create new user with full service plan configuration
      const result = await sql`
        INSERT INTO radius_users (
          username, password_hash, customer_id, service_id,
          ip_address, download_limit, upload_limit, 
          burst_download, burst_upload, burst_duration,
          priority_level, fup_enabled, fup_limit, fup_speed,
          simultaneous_use, expiry_date,
          status, created_at, updated_at
        ) VALUES (
          ${config.username}, ${password_hash}, ${config.customerId}, ${config.serviceId || null},
          ${config.ipAddress || null}, ${downloadSpeed}, ${uploadSpeed},
          ${burstDownload}, ${burstUpload}, ${burstDuration},
          ${servicePlan?.priority_level || "standard"}, 
          ${servicePlan?.fup_enabled || false}, 
          ${servicePlan?.data_limit || null}, 
          ${servicePlan?.fup_speed || null},
          ${servicePlan?.concurrent_connections || 1}, 
          ${config.expiryDate || null},
          'active', NOW(), NOW()
        )
        RETURNING id
      `

      console.log("[v0] Created RADIUS user with service plan settings:", {
        username: config.username,
        speeds: `${downloadSpeed}/${uploadSpeed}Mbps`,
        burst: burstDownload ? `${burstDownload}/${burstUpload}Mbps` : "disabled",
        fup: servicePlan?.fup_enabled ? "enabled" : "disabled",
        qos: servicePlan?.qos_enabled ? "enabled" : "disabled",
      })

      // Log to activity logs for audit trail (Rule 3)
      await sql`
        INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
        VALUES (
          'create', 'radius_user', ${result[0].id}, 
          ${JSON.stringify({
            customer_id: config.customerId,
            service_id: config.serviceId,
            speeds: { download: downloadSpeed, upload: uploadSpeed },
            features: { fup: servicePlan?.fup_enabled, qos: servicePlan?.qos_enabled },
          })}, 
          CURRENT_TIMESTAMP
        )
      `

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
    const sql = await getSql()

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
    const sql = await getSql()

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
    const sql = await getSql()

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
