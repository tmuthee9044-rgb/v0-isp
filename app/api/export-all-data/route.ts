import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Starting comprehensive data export...")

    // Export all major data tables
    const [customers, servicePlans, payments, networkDevices, users] = await Promise.all([
      sql`SELECT * FROM customers ORDER BY created_at DESC`,
      sql`SELECT * FROM service_plans ORDER BY created_at DESC`,
      sql`SELECT * FROM payments ORDER BY created_at DESC`,
      sql`SELECT * FROM network_devices ORDER BY created_at DESC`,
      sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`,
    ])

    const exportData = {
      export_date: new Date().toISOString(),
      export_version: "1.0",
      tables: {
        customers: {
          count: customers.length,
          data: customers,
        },
        service_plans: {
          count: servicePlans.length,
          data: servicePlans,
        },
        payments: {
          count: payments.length,
          data: payments,
        },
        network_devices: {
          count: networkDevices.length,
          data: networkDevices,
        },
        users: {
          count: users.length,
          data: users,
        },
      },
      summary: {
        total_customers: customers.length,
        active_customers: customers.filter((c) => c.status === "active").length,
        total_revenue: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        total_devices: networkDevices.length,
      },
    }

    return Response.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="isp_system_export_${new Date().toISOString().split("T")[0]}.json"`,
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Export all data error:", error)
    return Response.json({ error: "Failed to export data" }, { status: 500 })
  }
}
