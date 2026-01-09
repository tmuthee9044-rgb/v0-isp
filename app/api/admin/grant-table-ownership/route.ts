import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    // Get current database user
    const userResult = await sql`SELECT current_user`
    const currentUser = userResult[0]?.current_user

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Could not determine current user" }, { status: 500 })
    }

    // List of all tables that need ownership
    const tables = [
      "openvpn_logs",
      "router_sync_status",
      "messages",
      "payments",
      "capacity_alerts",
      "routers",
      "server_configurations",
      "bandwidth_patterns",
      "task_attachments",
      "communication_settings",
      "mpesa_logs",
      "network_forecasts",
      "tasks",
      "customer_addresses",
      "customer_categories",
      "router_performance_history",
      "finance_audit_trail",
      "capacity_predictions",
      "payroll_records",
      "admin_logs",
      "company_profiles",
      "payment_gateway_configs",
      "user_activity_logs",
      "infrastructure_investments",
      "customer_services",
      "message_campaigns",
      "radius_logs",
      "automation_workflows",
      "task_comments",
      "portal_settings",
      "invoices",
      "ip_subnets",
      "roles",
      "customers",
      "chart_of_accounts",
      "system_logs",
      "network_devices",
      "message_templates",
      "ip_addresses",
      "performance_reviews",
      "service_plans",
      "router_logs",
      "customer_contacts",
      "locations",
    ]

    const results = []
    let successCount = 0
    let errorCount = 0

    // Grant ownership or ALTER privileges
    for (const table of tables) {
      try {
        // Try to grant all privileges on the table
        await sql.unsafe(`GRANT ALL PRIVILEGES ON TABLE ${table} TO ${currentUser}`)
        successCount++
        results.push({ table, success: true })
      } catch (error: any) {
        errorCount++
        results.push({ table, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Granted privileges: ${successCount} tables, ${errorCount} errors`,
      currentUser,
      successCount,
      errorCount,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Error granting privileges:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
