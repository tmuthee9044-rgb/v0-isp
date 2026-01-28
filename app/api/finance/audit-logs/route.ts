import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Fetch finance audit trail data with better null handling
    // Note: The table may have either 'action' or 'action_type' column depending on migration
    let auditLogs: any[] = []
    try {
      auditLogs = await sql`
        SELECT 
          fat.id,
          fat.created_at,
          COALESCE(fat.action_type, fat.action, 'UNKNOWN') as action,
          fat.table_name as resource,
          fat.record_id,
          fat.old_values,
          fat.new_values,
          fat.ip_address,
          COALESCE(u.email, 'System') as user_email,
          COALESCE(u.username, 'System') as user_name
        FROM finance_audit_trail fat
        LEFT JOIN users u ON fat.user_id = u.id
        ORDER BY fat.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } catch (error) {
      console.log("[v0] finance_audit_trail query failed:", error)
    }

    // Fetch admin logs related to finance with better null handling
    let adminLogs: any[] = []
    try {
      adminLogs = await sql`
        SELECT 
          al.id,
          al.created_at,
          al.action,
          al.resource_type as resource,
          al.resource_id,
          al.old_values,
          al.new_values,
          al.ip_address,
          COALESCE(u.email, 'Admin') as user_email,
          COALESCE(u.username, 'Admin') as user_name
        FROM admin_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        WHERE al.resource_type IN ('invoice', 'payment', 'expense', 'customer', 'financial_adjustment')
        ORDER BY al.created_at DESC
        LIMIT ${Math.min(limit, 25)}
        OFFSET ${offset}
      `
    } catch (error) {
      console.log("[v0] admin_logs query failed:", error)
    }

    // Fetch user activity logs related to finance with better filtering
    let userActivityLogs: any[] = []
    try {
      userActivityLogs = await sql`
        SELECT 
          ual.id,
          ual.created_at,
          ual.activity as action,
          'user_activity' as resource,
          ual.user_id as record_id,
          NULL as old_values,
          NULL as new_values,
          ual.ip_address,
          COALESCE(ual.description, 'User activity logged') as description,
          COALESCE(u.email, 'User') as user_email,
          COALESCE(u.username, 'User') as user_name
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.id
        WHERE ual.activity ILIKE '%finance%' OR ual.activity ILIKE '%payment%' OR ual.activity ILIKE '%invoice%'
        ORDER BY ual.created_at DESC
        LIMIT ${Math.min(limit, 25)}
        OFFSET ${offset}
      `
    } catch (error) {
      console.log("[v0] user_activity_logs query failed:", error)
    }

    let activityLogs: any[] = []
    try {
      activityLogs = await sql`
        SELECT 
          al.id,
          al.created_at,
          al.action,
          al.entity_type as resource,
          al.entity_id as record_id,
          al.description as details,
          al.ip_address,
          COALESCE(u.email, u.username, 'System') as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type IN ('invoice', 'payment', 'expense', 'customer', 'transaction', 'financial_document')
           OR al.action ILIKE '%finance%'
           OR al.action ILIKE '%payment%'
           OR al.action ILIKE '%invoice%'
        ORDER BY al.created_at DESC
        LIMIT ${limit}
      `
    } catch (error) {
      console.log("[v0] activity_logs query failed:", error)
    }

    // Combine and format all logs with better error handling
    const allLogs = [
      ...auditLogs.map((log) => ({
        id: `audit_${log.id}`,
        timestamp: log.created_at,
        user: log.user_email || "System",
        action: (log.action || "UNKNOWN").toUpperCase(),
        resource: formatResourceName(log.resource || "unknown"),
        details: generateLogDetails({
          action: log.action,
          resource: log.resource,
          record_id: log.record_id,
          old_values: log.old_values,
          new_values: log.new_values,
        }),
        ip_address: log.ip_address || "N/A",
        status: "Success",
      })),
      ...adminLogs.map((log) => ({
        id: `admin_${log.id}`,
        timestamp: log.created_at,
        user: log.user_email || "Admin",
        action: (log.action || "UNKNOWN").toUpperCase(),
        resource: formatResourceName(log.resource || "unknown"),
        details: generateLogDetails({
          action: log.action,
          resource: log.resource,
          record_id: log.resource_id,
          old_values: log.old_values,
          new_values: log.new_values,
        }),
        ip_address: log.ip_address || "N/A",
        status: "Success",
      })),
      ...userActivityLogs.map((log) => ({
        id: `activity_${log.id}`,
        timestamp: log.created_at,
        user: log.user_email || "User",
        action: "ACTIVITY",
        resource: "User Activity",
        details: log.description || "User activity logged",
        ip_address: log.ip_address || "N/A",
        status: "Success",
      })),
      ...activityLogs.map((log) => ({
        id: `log_${log.id}`,
        timestamp: log.created_at,
        user: log.user_email || "System",
        action: (log.action || "VIEW").toUpperCase(),
        resource: formatResourceName(log.resource || "unknown"),
        details:
          log.details ||
          generateLogDetails({
            action: log.action,
            resource: log.resource,
            record_id: log.record_id,
          }),
        ip_address: log.ip_address || "N/A",
        status: "Success",
      })),
    ]

    // Sort by timestamp descending and limit results
    const sortedLogs = allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // Calculate activity summary with better date handling
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const activitySummary = {
      today: sortedLogs.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate >= todayStart
      }).length,
      thisWeek: sortedLogs.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate >= weekStart
      }).length,
      thisMonth: sortedLogs.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate >= monthStart
      }).length,
    }

    return NextResponse.json({
      logs: sortedLogs,
      activitySummary,
      total: sortedLogs.length,
      success: true,
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch audit logs",
        details: error instanceof Error ? error.message : "Unknown error",
        logs: [],
        activitySummary: { today: 0, thisWeek: 0, thisMonth: 0 },
        total: 0,
      },
      { status: 500 },
    )
  }
}

function formatResourceName(resource: string): string {
  if (!resource) return "Unknown"

  const resourceMap: { [key: string]: string } = {
    invoices: "Invoice",
    payments: "Payment",
    expenses: "Expense",
    customers: "Customer",
    financial_adjustments: "Financial Adjustment",
    tax_returns: "Tax Return",
    budget_line_items: "Budget",
    user_activity: "User Activity",
    transaction: "Transaction",
    financial_document: "Financial Document",
  }

  return resourceMap[resource] || resource.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function generateLogDetails(log: any): string {
  const { action, resource, record_id, old_values, new_values } = log

  if (!action || !resource) return "System activity logged"

  const resourceName = formatResourceName(resource)
  const actionLower = (action || "").toLowerCase()

  // Generate meaningful descriptions based on action and resource
  if (actionLower === "create" || actionLower === "insert") {
    return `Created new ${resourceName.toLowerCase()}${record_id ? ` (ID: ${record_id})` : ""}`
  } else if (actionLower === "update") {
    return `Updated ${resourceName.toLowerCase()}${record_id ? ` (ID: ${record_id})` : ""}`
  } else if (actionLower === "delete") {
    return `Deleted ${resourceName.toLowerCase()}${record_id ? ` (ID: ${record_id})` : ""}`
  } else if (actionLower === "export") {
    return `Exported ${resourceName.toLowerCase()} data`
  } else if (actionLower === "view" || actionLower === "read") {
    return `Viewed ${resourceName.toLowerCase()}${record_id ? ` (ID: ${record_id})` : ""}`
  }

  return `${action} action performed on ${resourceName.toLowerCase()}`
}
