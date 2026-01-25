import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    console.log("[v0] Starting permissions seeding...")

    // Comprehensive permissions based on actual app folder structure
    const permissions = [
      // Dashboard Module
      { name: "dashboard.view", description: "View Dashboard", module: "dashboard", category: "view" },
      { name: "dashboard.analytics", description: "View Analytics", module: "dashboard", category: "view" },
      
      // Customers Module
      { name: "customers.view", description: "View Customers", module: "customers", category: "view" },
      { name: "customers.create", description: "Create Customers", module: "customers", category: "create" },
      { name: "customers.edit", description: "Edit Customers", module: "customers", category: "edit" },
      { name: "customers.delete", description: "Delete Customers", module: "customers", category: "delete" },
      { name: "customers.export", description: "Export Customers", module: "customers", category: "export" },
      { name: "customers.import", description: "Import Customers", module: "customers", category: "import" },
      
      // Services Module
      { name: "services.view", description: "View Services", module: "services", category: "view" },
      { name: "services.create", description: "Create Services", module: "services", category: "create" },
      { name: "services.edit", description: "Edit Services", module: "services", category: "edit" },
      { name: "services.delete", description: "Delete Services", module: "services", category: "delete" },
      { name: "services.activate", description: "Activate Services", module: "services", category: "manage" },
      { name: "services.suspend", description: "Suspend Services", module: "services", category: "manage" },
      
      // Billing Module
      { name: "billing.view", description: "View Billing", module: "billing", category: "view" },
      { name: "billing.invoices", description: "Manage Invoices", module: "billing", category: "manage" },
      { name: "billing.payments", description: "Process Payments", module: "billing", category: "manage" },
      { name: "billing.credit", description: "Manage Credit", module: "billing", category: "manage" },
      { name: "billing.statements", description: "Generate Statements", module: "billing", category: "manage" },
      
      // Finance Module
      { name: "finance.view", description: "View Finance", module: "finance", category: "view" },
      { name: "finance.expenses", description: "Manage Expenses", module: "finance", category: "manage" },
      { name: "finance.revenue", description: "View Revenue", module: "finance", category: "view" },
      { name: "finance.reports", description: "Generate Financial Reports", module: "finance", category: "view" },
      { name: "finance.budget", description: "Manage Budget", module: "finance", category: "manage" },
      { name: "finance.accounting", description: "Access Accounting", module: "finance", category: "manage" },
      
      // Network Module
      { name: "network.view", description: "View Network", module: "network", category: "view" },
      { name: "network.routers", description: "Manage Routers", module: "network", category: "manage" },
      { name: "network.subnets", description: "Manage Subnets", module: "network", category: "manage" },
      { name: "network.ip_addresses", description: "Manage IP Addresses", module: "network", category: "manage" },
      { name: "network.monitoring", description: "Network Monitoring", module: "network", category: "view" },
      { name: "network.configuration", description: "Network Configuration", module: "network", category: "manage" },
      
      // Hotspots Module
      { name: "hotspots.view", description: "View Hotspots", module: "hotspots", category: "view" },
      { name: "hotspots.create", description: "Create Hotspots", module: "hotspots", category: "create" },
      { name: "hotspots.edit", description: "Edit Hotspots", module: "hotspots", category: "edit" },
      { name: "hotspots.delete", description: "Delete Hotspots", module: "hotspots", category: "delete" },
      { name: "hotspots.vouchers", description: "Manage Vouchers", module: "hotspots", category: "manage" },
      
      // Reports Module
      { name: "reports.view", description: "View Reports", module: "reports", category: "view" },
      { name: "reports.revenue", description: "Revenue Reports", module: "reports", category: "view" },
      { name: "reports.customers", description: "Customer Reports", module: "reports", category: "view" },
      { name: "reports.network", description: "Network Reports", module: "reports", category: "view" },
      { name: "reports.export", description: "Export Reports", module: "reports", category: "export" },
      
      // Inventory Module
      { name: "inventory.view", description: "View Inventory", module: "inventory", category: "view" },
      { name: "inventory.create", description: "Create Inventory Items", module: "inventory", category: "create" },
      { name: "inventory.edit", description: "Edit Inventory Items", module: "inventory", category: "edit" },
      { name: "inventory.delete", description: "Delete Inventory Items", module: "inventory", category: "delete" },
      { name: "inventory.stock", description: "Manage Stock", module: "inventory", category: "manage" },
      
      // Warehouses Module
      { name: "warehouses.view", description: "View Warehouses", module: "warehouses", category: "view" },
      { name: "warehouses.create", description: "Create Warehouses", module: "warehouses", category: "create" },
      { name: "warehouses.edit", description: "Edit Warehouses", module: "warehouses", category: "edit" },
      { name: "warehouses.delete", description: "Delete Warehouses", module: "warehouses", category: "delete" },
      
      // Suppliers Module
      { name: "suppliers.view", description: "View Suppliers", module: "suppliers", category: "view" },
      { name: "suppliers.create", description: "Create Suppliers", module: "suppliers", category: "create" },
      { name: "suppliers.edit", description: "Edit Suppliers", module: "suppliers", category: "edit" },
      { name: "suppliers.delete", description: "Delete Suppliers", module: "suppliers", category: "delete" },
      { name: "suppliers.invoices", description: "Manage Supplier Invoices", module: "suppliers", category: "manage" },
      
      // HR Module
      { name: "hr.view", description: "View HR", module: "hr", category: "view" },
      { name: "hr.employees", description: "Manage Employees", module: "hr", category: "manage" },
      { name: "hr.attendance", description: "Manage Attendance", module: "hr", category: "manage" },
      { name: "hr.payroll", description: "Manage Payroll", module: "hr", category: "manage" },
      { name: "hr.leave", description: "Manage Leave", module: "hr", category: "manage" },
      
      // Vehicles Module
      { name: "vehicles.view", description: "View Vehicles", module: "vehicles", category: "view" },
      { name: "vehicles.create", description: "Create Vehicles", module: "vehicles", category: "create" },
      { name: "vehicles.edit", description: "Edit Vehicles", module: "vehicles", category: "edit" },
      { name: "vehicles.delete", description: "Delete Vehicles", module: "vehicles", category: "delete" },
      { name: "vehicles.maintenance", description: "Manage Vehicle Maintenance", module: "vehicles", category: "manage" },
      { name: "vehicles.fuel", description: "Manage Fuel Logs", module: "vehicles", category: "manage" },
      
      // Messages Module
      { name: "messages.view", description: "View Messages", module: "messages", category: "view" },
      { name: "messages.send", description: "Send Messages", module: "messages", category: "create" },
      { name: "messages.bulk", description: "Send Bulk Messages", module: "messages", category: "create" },
      { name: "messages.templates", description: "Manage Message Templates", module: "messages", category: "manage" },
      
      // Tasks Module
      { name: "tasks.view", description: "View Tasks", module: "tasks", category: "view" },
      { name: "tasks.create", description: "Create Tasks", module: "tasks", category: "create" },
      { name: "tasks.edit", description: "Edit Tasks", module: "tasks", category: "edit" },
      { name: "tasks.delete", description: "Delete Tasks", module: "tasks", category: "delete" },
      { name: "tasks.assign", description: "Assign Tasks", module: "tasks", category: "manage" },
      
      // Support Module
      { name: "support.view", description: "View Support Tickets", module: "support", category: "view" },
      { name: "support.create", description: "Create Support Tickets", module: "support", category: "create" },
      { name: "support.edit", description: "Edit Support Tickets", module: "support", category: "edit" },
      { name: "support.close", description: "Close Support Tickets", module: "support", category: "manage" },
      { name: "support.assign", description: "Assign Support Tickets", module: "support", category: "manage" },
      
      // Logs Module
      { name: "logs.view", description: "View System Logs", module: "logs", category: "view" },
      { name: "logs.export", description: "Export Logs", module: "logs", category: "export" },
      { name: "logs.radius", description: "View RADIUS Logs", module: "logs", category: "view" },
      { name: "logs.activity", description: "View Activity Logs", module: "logs", category: "view" },
      
      // Automation Module
      { name: "automation.view", description: "View Automation", module: "automation", category: "view" },
      { name: "automation.create", description: "Create Automation Rules", module: "automation", category: "create" },
      { name: "automation.edit", description: "Edit Automation Rules", module: "automation", category: "edit" },
      { name: "automation.delete", description: "Delete Automation Rules", module: "automation", category: "delete" },
      
      // Settings Module
      { name: "settings.view", description: "View Settings", module: "settings", category: "view" },
      { name: "settings.company", description: "Manage Company Settings", module: "settings", category: "manage" },
      { name: "settings.billing", description: "Manage Billing Settings", module: "settings", category: "manage" },
      { name: "settings.network", description: "Manage Network Settings", module: "settings", category: "manage" },
      { name: "settings.portal", description: "Manage Portal Settings", module: "settings", category: "manage" },
      { name: "settings.servers", description: "Manage Servers", module: "settings", category: "manage" },
      { name: "settings.integrations", description: "Manage Integrations", module: "settings", category: "manage" },
      
      // Admin Module
      { name: "admin.view", description: "View Admin Panel", module: "admin", category: "view" },
      { name: "admin.users", description: "Manage Users", module: "admin", category: "manage" },
      { name: "admin.roles", description: "Manage Roles", module: "admin", category: "manage" },
      { name: "admin.permissions", description: "Manage Permissions", module: "admin", category: "manage" },
      { name: "admin.system", description: "System Administration", module: "admin", category: "manage" },
      
      // Setup Module
      { name: "setup.view", description: "View Setup", module: "setup", category: "view" },
      { name: "setup.wizard", description: "Access Setup Wizard", module: "setup", category: "manage" },
      { name: "setup.import", description: "Import Data", module: "setup", category: "manage" },
      { name: "setup.export", description: "Export Data", module: "setup", category: "manage" },
    ]

    let insertedCount = 0
    let skippedCount = 0

    for (const permission of permissions) {
      try {
        const existing = await sql`
          SELECT id FROM permissions WHERE name = ${permission.name}
        `

        if (existing.length === 0) {
          await sql`
            INSERT INTO permissions (name, description, module, category)
            VALUES (${permission.name}, ${permission.description}, ${permission.module}, ${permission.category})
          `
          insertedCount++
          console.log(`[v0] Inserted permission: ${permission.name}`)
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error(`[v0] Error inserting permission ${permission.name}:`, error)
      }
    }

    console.log(`[v0] Permissions seeding complete: ${insertedCount} inserted, ${skippedCount} skipped`)

    return NextResponse.json({
      success: true,
      message: "Permissions seeded successfully",
      inserted: insertedCount,
      skipped: skippedCount,
      total: permissions.length,
    })
  } catch (error) {
    console.error("[v0] Error seeding permissions:", error)
    return NextResponse.json(
      { success: false, error: "Failed to seed permissions" },
      { status: 500 }
    )
  }
}
