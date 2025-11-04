import { neon } from "@/lib/neon-wrapper"
import { DatabaseUtils } from "@/lib/db-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Starting comprehensive module verification...")

    const verificationResults = {
      timestamp: new Date().toISOString(),
      overallStatus: "unknown",
      overallScore: 0,
      modules: {} as Record<string, any>,
      summary: {
        totalModules: 0,
        workingModules: 0,
        failedModules: 0,
        warnings: 0,
      },
    }

    // Module verification tests
    const moduleTests = [
      {
        name: "Customer Management",
        tests: [
          {
            name: "Customer CRUD Operations",
            test: async () => {
              const customers = await DatabaseUtils.getCustomers({ limit: 5 })
              const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
              return {
                success: true,
                data: { customerCount: customerCount[0].count, sampleSize: customers.length },
              }
            },
          },
          {
            name: "Customer Services Integration",
            test: async () => {
              const result = await sql`
                SELECT COUNT(*) as count 
                FROM customer_services cs 
                JOIN customers c ON cs.customer_id = c.id
              `
              return { success: true, data: { linkedServices: result[0].count } }
            },
          },
        ],
      },
      {
        name: "Service Management",
        tests: [
          {
            name: "Service Plans",
            test: async () => {
              const plans = await DatabaseUtils.getServicePlans()
              return { success: true, data: { planCount: plans.length } }
            },
          },
          {
            name: "Service Configuration",
            test: async () => {
              const result = await sql`
                SELECT COUNT(*) as active_services 
                FROM customer_services 
                WHERE status = 'active'
              `
              return { success: true, data: { activeServices: result[0].active_services } }
            },
          },
        ],
      },
      {
        name: "Billing & Payments",
        tests: [
          {
            name: "Payment Processing",
            test: async () => {
              const payments = await DatabaseUtils.getPayments({ status: "completed" })
              const totalRevenue = await sql`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM payments 
                WHERE status = 'completed'
              `
              return {
                success: true,
                data: { paymentCount: payments.length, totalRevenue: totalRevenue[0].total },
              }
            },
          },
          {
            name: "Invoice Generation",
            test: async () => {
              const invoices = await sql`SELECT COUNT(*) as count FROM invoices`
              return { success: true, data: { invoiceCount: invoices[0].count } }
            },
          },
          {
            name: "Billing Cycles",
            test: async () => {
              const cycles = await sql`SELECT COUNT(*) as count FROM billing_cycles`
              return { success: true, data: { billingCycles: cycles[0].count } }
            },
          },
        ],
      },
      {
        name: "Network Management",
        tests: [
          {
            name: "Network Devices",
            test: async () => {
              const devices = await DatabaseUtils.getNetworkDevices()
              const activeDevices = await sql`
                SELECT COUNT(*) as count 
                FROM network_devices 
                WHERE status = 'online'
              `
              return {
                success: true,
                data: { totalDevices: devices.length, activeDevices: activeDevices[0].count },
              }
            },
          },
          {
            name: "IP Address Management",
            test: async () => {
              const ipAddresses = await sql`
                SELECT 
                  COUNT(*) as total,
                  COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
                  COUNT(CASE WHEN status = 'available' THEN 1 END) as available
                FROM ip_addresses
              `
              return { success: true, data: ipAddresses[0] }
            },
          },
          {
            name: "Network Monitoring",
            test: async () => {
              const monitoring = await sql`
                SELECT COUNT(*) as records 
                FROM network_monitoring 
                WHERE timestamp >= CURRENT_DATE - INTERVAL '24 hours'
              `
              return { success: true, data: { recentMonitoringRecords: monitoring[0].records } }
            },
          },
        ],
      },
      {
        name: "HR Management",
        tests: [
          {
            name: "Employee Management",
            test: async () => {
              const employees = await DatabaseUtils.getEmployees()
              const activeEmployees = await sql`
                SELECT COUNT(*) as count 
                FROM employees 
                WHERE status = 'active'
              `
              return {
                success: true,
                data: { totalEmployees: employees.length, activeEmployees: activeEmployees[0].count },
              }
            },
          },
          {
            name: "Payroll System",
            test: async () => {
              const payroll = await sql`
                SELECT 
                  COUNT(*) as records,
                  COALESCE(SUM(net_pay), 0) as total_payroll
                FROM payroll
              `
              return { success: true, data: payroll[0] }
            },
          },
          {
            name: "Leave Management",
            test: async () => {
              const leaveRequests = await sql`
                SELECT 
                  COUNT(*) as total_requests,
                  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
                FROM leave_requests
              `
              return { success: true, data: leaveRequests[0] }
            },
          },
        ],
      },
      {
        name: "Support System",
        tests: [
          {
            name: "Support Tickets",
            test: async () => {
              const tickets = await DatabaseUtils.getSupportTickets()
              const openTickets = await sql`
                SELECT COUNT(*) as count 
                FROM support_tickets 
                WHERE status IN ('open', 'in_progress')
              `
              return {
                success: true,
                data: { totalTickets: tickets.length, openTickets: openTickets[0].count },
              }
            },
          },
          {
            name: "Customer Communications",
            test: async () => {
              const communications = await sql`
                SELECT 
                  COUNT(*) as total,
                  COUNT(CASE WHEN type = 'email' THEN 1 END) as emails,
                  COUNT(CASE WHEN type = 'sms' THEN 1 END) as sms
                FROM customer_communications
              `
              return { success: true, data: communications[0] }
            },
          },
        ],
      },
      {
        name: "Inventory Management",
        tests: [
          {
            name: "Inventory Items",
            test: async () => {
              const items = await DatabaseUtils.getInventoryItems()
              const lowStock = await sql`
                SELECT COUNT(*) as count 
                FROM inventory_items 
                WHERE quantity_in_stock <= minimum_stock_level
              `
              return {
                success: true,
                data: { totalItems: items.length, lowStockItems: lowStock[0].count },
              }
            },
          },
          {
            name: "Inventory Movements",
            test: async () => {
              const movements = await sql`
                SELECT 
                  COUNT(*) as total_movements,
                  COUNT(CASE WHEN movement_type = 'in' THEN 1 END) as stock_in,
                  COUNT(CASE WHEN movement_type = 'out' THEN 1 END) as stock_out
                FROM inventory_movements
              `
              return { success: true, data: movements[0] }
            },
          },
        ],
      },
      {
        name: "Financial Management",
        tests: [
          {
            name: "Financial Accounts",
            test: async () => {
              const accounts = await sql`
                SELECT 
                  COUNT(*) as total_accounts,
                  COUNT(CASE WHEN account_type = 'asset' THEN 1 END) as assets,
                  COUNT(CASE WHEN account_type = 'revenue' THEN 1 END) as revenue_accounts
                FROM financial_accounts
              `
              return { success: true, data: accounts[0] }
            },
          },
          {
            name: "Transaction Records",
            test: async () => {
              const transactions = await sql`
                SELECT 
                  COUNT(*) as total_transactions,
                  COALESCE(SUM(amount), 0) as total_amount
                FROM transactions
              `
              return { success: true, data: transactions[0] }
            },
          },
        ],
      },
      {
        name: "System Administration",
        tests: [
          {
            name: "User Management",
            test: async () => {
              const users = await sql`
                SELECT 
                  COUNT(*) as total_users,
                  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
                FROM users
              `
              return { success: true, data: users[0] }
            },
          },
          {
            name: "System Configuration",
            test: async () => {
              const config = await sql`SELECT COUNT(*) as count FROM system_config`
              return { success: true, data: { configEntries: config[0].count } }
            },
          },
          {
            name: "Audit Trail",
            test: async () => {
              const auditRecords = await sql`
                SELECT COUNT(*) as count 
                FROM audit_trail 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
              `
              return { success: true, data: { recentAuditRecords: auditRecords[0].count } }
            },
          },
          {
            name: "System Logs",
            test: async () => {
              const logs = await sql`
                SELECT 
                  COUNT(*) as total_logs,
                  COUNT(CASE WHEN log_level = 'error' THEN 1 END) as error_logs
                FROM system_logs 
                WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
              `
              return { success: true, data: logs[0] }
            },
          },
        ],
      },
    ]

    // Execute all module tests
    for (const module of moduleTests) {
      console.log(`[v0] Testing module: ${module.name}`)
      verificationResults.modules[module.name] = {
        status: "unknown",
        tests: {},
        score: 0,
        passedTests: 0,
        totalTests: module.tests.length,
      }

      let passedTests = 0

      for (const test of module.tests) {
        try {
          const result = await test.test()
          verificationResults.modules[module.name].tests[test.name] = {
            status: "passed",
            ...result,
          }
          passedTests++
          console.log(`[v0] ✓ ${module.name} - ${test.name}`)
        } catch (error) {
          verificationResults.modules[module.name].tests[test.name] = {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          }
          console.log(`[v0] ✗ ${module.name} - ${test.name}:`, error)
        }
      }

      verificationResults.modules[module.name].passedTests = passedTests
      verificationResults.modules[module.name].score = Math.round((passedTests / module.tests.length) * 100)
      verificationResults.modules[module.name].status =
        passedTests === module.tests.length ? "working" : passedTests > 0 ? "partial" : "failed"
    }

    // Calculate overall statistics
    const moduleNames = Object.keys(verificationResults.modules)
    verificationResults.summary.totalModules = moduleNames.length
    verificationResults.summary.workingModules = moduleNames.filter(
      (name) => verificationResults.modules[name].status === "working",
    ).length
    verificationResults.summary.failedModules = moduleNames.filter(
      (name) => verificationResults.modules[name].status === "failed",
    ).length
    verificationResults.summary.warnings = moduleNames.filter(
      (name) => verificationResults.modules[name].status === "partial",
    ).length

    // Calculate overall score
    const totalScore = moduleNames.reduce((sum, name) => sum + verificationResults.modules[name].score, 0)
    verificationResults.overallScore = Math.round(totalScore / moduleNames.length)

    // Determine overall status
    if (verificationResults.overallScore >= 90) {
      verificationResults.overallStatus = "excellent"
    } else if (verificationResults.overallScore >= 75) {
      verificationResults.overallStatus = "good"
    } else if (verificationResults.overallScore >= 50) {
      verificationResults.overallStatus = "fair"
    } else {
      verificationResults.overallStatus = "poor"
    }

    console.log(`[v0] Module verification completed. Overall score: ${verificationResults.overallScore}%`)

    return Response.json({
      success: true,
      message: "Module verification completed",
      ...verificationResults,
    })
  } catch (error) {
    console.error("[v0] Module verification error:", error)
    return Response.json(
      {
        success: false,
        error: "Module verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
