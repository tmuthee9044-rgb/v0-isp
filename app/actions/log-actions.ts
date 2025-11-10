"use server"

import { sql } from "@vercel/postgres"
import { revalidatePath } from "next/cache"

export interface LogEntry {
  id: string
  timestamp: string
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "DEBUG"
  source: string
  category: string
  message: string
  ip_address?: string
  user_id?: string
  details?: any
}

export interface LogFilters {
  category?: string
  level?: string
  search?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// Get system logs with filtering
export async function getSystemLogs(filters: LogFilters = {}) {
  try {
    let query = `
      SELECT 
        id::text,
        timestamp::text,
        level,
        source,
        category,
        message,
        ip_address::text,
        user_id,
        details
      FROM system_logs
      WHERE 1=1
    `

    const params: any[] = []
    let paramCount = 0

    if (filters.category && filters.category !== "all") {
      paramCount++
      query += ` AND category = $${paramCount}`
      params.push(filters.category)
    }

    if (filters.level && filters.level !== "all") {
      paramCount++
      query += ` AND level = $${paramCount}`
      params.push(filters.level)
    }

    if (filters.search) {
      paramCount++
      query += ` AND (message ILIKE $${paramCount} OR source ILIKE $${paramCount} OR ip_address::text ILIKE $${paramCount})`
      params.push(`%${filters.search}%`)
    }

    if (filters.startDate) {
      paramCount++
      query += ` AND timestamp >= $${paramCount}`
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      paramCount++
      query += ` AND timestamp <= $${paramCount}`
      params.push(filters.endDate)
    }

    query += ` ORDER BY timestamp DESC`

    if (filters.limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(filters.limit)
    }

    if (filters.offset) {
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(filters.offset)
    }

    const result = await sql.query(query, params)
    return { success: true, data: result.rows as LogEntry[] }
  } catch (error) {
    console.error("Error fetching system logs:", error)
    return { success: false, error: "Failed to fetch system logs" }
  }
}

// Get logs by category (OpenVPN, RADIUS, M-Pesa, etc.)
export async function getLogsByCategory(category: string, filters: LogFilters = {}) {
  try {
    let tableName = "system_logs"
    let selectFields = `
      id::text,
      timestamp::text,
      level,
      source,
      category,
      message,
      ip_address::text,
      user_id,
      details
    `

    switch (category) {
      case "openvpn":
        tableName = "openvpn_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          event_type as source,
          'openvpn' as category,
          CASE 
            WHEN event_type = 'connect' THEN 'Client connected: ' || COALESCE(user_id, 'unknown')
            WHEN event_type = 'disconnect' THEN 'Client disconnected: ' || COALESCE(user_id, 'unknown')
            WHEN event_type = 'auth_failure' THEN 'Authentication failed: ' || COALESCE(user_id, 'unknown')
            ELSE event_type
          END as message,
          client_ip::text as ip_address,
          user_id,
          details
        `
        break
      case "radius":
        tableName = "radius_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          event_type as source,
          'radius' as category,
          CASE 
            WHEN event_type = 'auth_accept' THEN 'Authentication accepted: ' || COALESCE(username, 'unknown')
            WHEN event_type = 'auth_reject' THEN 'Authentication rejected: ' || COALESCE(username, 'unknown')
            ELSE event_type || COALESCE(' - ' || reply_message, '')
          END as message,
          client_ip::text as ip_address,
          username as user_id,
          details
        `
        break
      case "mpesa":
        tableName = "mpesa_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          event_type as source,
          'mpesa' as category,
          CASE 
            WHEN event_type = 'payment_success' THEN 'Payment received: KES ' || amount::text
            WHEN event_type = 'payment_failure' THEN 'Payment failed: ' || COALESCE(result_desc, 'Unknown error')
            ELSE event_type
          END as message,
          ip_address::text,
          phone_number as user_id,
          details
        `
        break
      case "router":
        tableName = "router_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          device_name as source,
          'router' as category,
          message,
          device_ip::text as ip_address,
          NULL as user_id,
          details
        `
        break
      case "admin":
        tableName = "admin_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          'Admin Portal' as source,
          'admin' as category,
          action || ' by ' || admin_username as message,
          ip_address::text,
          admin_user_id as user_id,
          details
        `
        break
      case "user":
        tableName = "user_activity_logs"
        selectFields = `
          id::text,
          timestamp::text,
          level,
          'Customer Portal' as source,
          'user' as category,
          activity_type || ' by ' || COALESCE(username, 'user') as message,
          ip_address::text,
          user_id::text,
          details
        `
        break
    }

    let query = `SELECT ${selectFields} FROM ${tableName} WHERE 1=1`
    const params: any[] = []
    let paramCount = 0

    if (filters.level && filters.level !== "all") {
      paramCount++
      query += ` AND level = $${paramCount}`
      params.push(filters.level)
    }

    if (filters.search) {
      paramCount++
      if (category === "openvpn") {
        query += ` AND (user_id ILIKE $${paramCount} OR client_ip::text ILIKE $${paramCount})`
      } else if (category === "radius") {
        query += ` AND (username ILIKE $${paramCount} OR client_ip::text ILIKE $${paramCount})`
      } else if (category === "mpesa") {
        query += ` AND (phone_number ILIKE $${paramCount} OR transaction_id ILIKE $${paramCount})`
      } else {
        query += ` AND message ILIKE $${paramCount}`
      }
      params.push(`%${filters.search}%`)
    }

    query += ` ORDER BY timestamp DESC`

    if (filters.limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(filters.limit)
    }

    const result = await sql.query(query, params)
    return { success: true, data: result.rows as LogEntry[] }
  } catch (error) {
    console.error(`Error fetching ${category} logs:`, error)
    return { success: false, error: `Failed to fetch ${category} logs` }
  }
}

// Get log statistics
export async function getLogStatistics() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE level = 'ERROR') as error_count,
        COUNT(*) FILTER (WHERE level = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE level = 'INFO' OR level = 'SUCCESS') as info_count,
        COUNT(*) FILTER (WHERE category = 'openvpn') as openvpn_count,
        COUNT(*) FILTER (WHERE category = 'radius') as radius_count,
        COUNT(*) FILTER (WHERE category = 'mpesa') as mpesa_count,
        COUNT(*) FILTER (WHERE category = 'router') as router_count,
        COUNT(*) FILTER (WHERE category = 'system') as system_count,
        COUNT(*) FILTER (WHERE category = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE category = 'user') as user_count
      FROM system_logs
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `

    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error fetching log statistics:", error)
    return { success: false, error: "Failed to fetch log statistics" }
  }
}

// Get critical events
export async function getCriticalEvents(limit = 50) {
  try {
    const result = await sql`
      SELECT * FROM critical_events
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `

    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Error fetching critical events:", error)
    return { success: false, error: "Failed to fetch critical events" }
  }
}

// Log system event
export async function logSystemEvent(
  level: string,
  source: string,
  category: string,
  message: string,
  ipAddress?: string,
  userId?: string,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO system_logs (level, source, category, message, ip_address, user_id, details)
      VALUES (${level}, ${source}, ${category}, ${message}, ${ipAddress}, ${userId}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging system event:", error)
    return { success: false, error: "Failed to log system event" }
  }
}

// Log OpenVPN event
export async function logOpenVPNEvent(
  level: string,
  eventType: string,
  clientIp?: string,
  vpnIp?: string,
  userId?: string,
  sessionId?: string,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO openvpn_logs (level, event_type, client_ip, vpn_ip, user_id, session_id, details)
      VALUES (${level}, ${eventType}, ${clientIp}, ${vpnIp}, ${userId}, ${sessionId}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging OpenVPN event:", error)
    return { success: false, error: "Failed to log OpenVPN event" }
  }
}

// Log RADIUS event
export async function logRADIUSEvent(
  level: string,
  eventType: string,
  username?: string,
  clientIp?: string,
  nasIp?: string,
  sessionId?: string,
  replyMessage?: string,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO radius_logs (level, event_type, username, client_ip, nas_ip, session_id, reply_message, details)
      VALUES (${level}, ${eventType}, ${username}, ${clientIp}, ${nasIp}, ${sessionId}, ${replyMessage}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging RADIUS event:", error)
    return { success: false, error: "Failed to log RADIUS event" }
  }
}

// Log M-Pesa transaction
export async function logMpesaTransaction(
  level: string,
  eventType: string,
  transactionId?: string,
  mpesaReceiptNumber?: string,
  phoneNumber?: string,
  amount?: number,
  customerId?: number,
  resultCode?: number,
  resultDesc?: string,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO mpesa_logs (level, event_type, transaction_id, mpesa_receipt_number, phone_number, amount, customer_id, result_code, result_desc, details)
      VALUES (${level}, ${eventType}, ${transactionId}, ${mpesaReceiptNumber}, ${phoneNumber}, ${amount}, ${customerId}, ${resultCode}, ${resultDesc}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging M-Pesa transaction:", error)
    return { success: false, error: "Failed to log M-Pesa transaction" }
  }
}

// Log router event
export async function logRouterEvent(
  level: string,
  deviceId: string,
  deviceName: string,
  deviceIp: string,
  eventType: string,
  message: string,
  cpuUsage?: number,
  memoryUsage?: number,
  bandwidthUsage?: number,
  alertThresholdExceeded?: boolean,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO router_logs (level, device_id, device_name, device_ip, event_type, message, cpu_usage, memory_usage, bandwidth_usage, alert_threshold_exceeded, details)
      VALUES (${level}, ${deviceId}, ${deviceName}, ${deviceIp}, ${eventType}, ${message}, ${cpuUsage}, ${memoryUsage}, ${bandwidthUsage}, ${alertThresholdExceeded}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging router event:", error)
    return { success: false, error: "Failed to log router event" }
  }
}

// Log admin activity
export async function logAdminActivity(
  level: string,
  adminUserId: string,
  adminUsername: string,
  action: string,
  targetType?: string,
  targetId?: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string,
  changesMade?: any,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO admin_logs (level, admin_user_id, admin_username, action, target_type, target_id, ip_address, user_agent, session_id, changes_made, details)
      VALUES (${level}, ${adminUserId}, ${adminUsername}, ${action}, ${targetType}, ${targetId}, ${ipAddress}, ${userAgent}, ${sessionId}, ${JSON.stringify(changesMade)}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging admin activity:", error)
    return { success: false, error: "Failed to log admin activity" }
  }
}

// Log user activity
export async function logUserActivity(
  level: string,
  userId: number,
  username: string,
  activityType: string,
  pageAccessed?: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string,
  details?: any,
) {
  try {
    const result = await sql`
      INSERT INTO user_activity_logs (level, user_id, username, activity_type, page_accessed, ip_address, user_agent, session_id, details)
      VALUES (${level}, ${userId}, ${username}, ${activityType}, ${pageAccessed}, ${ipAddress}, ${userAgent}, ${sessionId}, ${JSON.stringify(details)})
      RETURNING id
    `

    revalidatePath("/logs")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error logging user activity:", error)
    return { success: false, error: "Failed to log user activity" }
  }
}

// Clean up old logs
export async function cleanupOldLogs(retentionDays = 90) {
  try {
    const result = await sql`SELECT cleanup_old_logs(${retentionDays})`

    revalidatePath("/logs")
    return { success: true, data: { deletedCount: result.rows[0].cleanup_old_logs } }
  } catch (error) {
    console.error("Error cleaning up old logs:", error)
    return { success: false, error: "Failed to clean up old logs" }
  }
}
