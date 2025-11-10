import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const importData = await request.json()

    if (!importData.tables) {
      return Response.json({ error: "Invalid import data format" }, { status: 400 })
    }

    const results = {
      customers: { imported: 0, errors: 0 },
      service_plans: { imported: 0, errors: 0 },
      payments: { imported: 0, errors: 0 },
      network_devices: { imported: 0, errors: 0 },
    }

    // Import customers
    if (importData.tables.customers?.data) {
      for (const customer of importData.tables.customers.data) {
        try {
          // Check if customer already exists
          const existing = await sql`SELECT id FROM customers WHERE email = ${customer.email}`
          if (existing.length > 0) {
            results.customers.errors++
            continue
          }

          await sql`
            INSERT INTO customers (
              name, last_name, email, phone, customer_type, status,
              monthly_fee, balance, physical_address, created_at, updated_at
            ) VALUES (
              ${customer.name || ""},
              ${customer.last_name || ""},
              ${customer.email || ""},
              ${customer.phone || ""},
              ${customer.customer_type || "individual"},
              ${customer.status || "active"},
              ${customer.monthly_fee || 0},
              ${customer.balance || 0},
              ${customer.physical_address || customer.address || ""},
              ${customer.created_at || new Date().toISOString()},
              NOW()
            )
          `
          results.customers.imported++
        } catch (error) {
          console.error("Error importing customer:", error)
          results.customers.errors++
        }
      }
    }

    // Import service plans
    if (importData.tables.service_plans?.data) {
      for (const plan of importData.tables.service_plans.data) {
        try {
          // Check if plan already exists
          const existing = await sql`SELECT id FROM service_plans WHERE name = ${plan.name}`
          if (existing.length > 0) {
            results.service_plans.errors++
            continue
          }

          await sql`
            INSERT INTO service_plans (
              name, description, price, speed, status, created_at
            ) VALUES (
              ${plan.name || ""},
              ${plan.description || ""},
              ${plan.price || 0},
              ${plan.speed || ""},
              ${plan.status || "active"},
              ${plan.created_at || new Date().toISOString()}
            )
          `
          results.service_plans.imported++
        } catch (error) {
          console.error("Error importing service plan:", error)
          results.service_plans.errors++
        }
      }
    }

    // Import payments
    if (importData.tables.payments?.data) {
      for (const payment of importData.tables.payments.data) {
        try {
          await sql`
            INSERT INTO payments (
              customer_id, amount, payment_method, status, description, 
              payment_date, created_at
            ) VALUES (
              ${payment.customer_id || null},
              ${payment.amount || 0},
              ${payment.payment_method || "mpesa"},
              ${payment.status || "completed"},
              ${payment.description || ""},
              ${payment.payment_date || payment.created_at || new Date().toISOString()},
              ${payment.created_at || new Date().toISOString()}
            )
          `
          results.payments.imported++
        } catch (error) {
          console.error("Error importing payment:", error)
          results.payments.errors++
        }
      }
    }

    // Import network devices
    if (importData.tables.network_devices?.data) {
      for (const device of importData.tables.network_devices.data) {
        try {
          // Check if device already exists
          const existing = await sql`SELECT id FROM network_devices WHERE mac_address = ${device.mac_address}`
          if (existing.length > 0) {
            results.network_devices.errors++
            continue
          }

          await sql`
            INSERT INTO network_devices (
              id, name, type, ip_address, mac_address, status, location, created_at, updated_at
            ) VALUES (
              ${device.id || crypto.randomUUID()},
              ${device.name || ""},
              ${device.type || "router"},
              ${device.ip_address || null},
              ${device.mac_address || ""},
              ${device.status || "active"},
              ${device.location || ""},
              ${device.created_at || new Date().toISOString()},
              NOW()
            )
          `
          results.network_devices.imported++
        } catch (error) {
          console.error("Error importing network device:", error)
          results.network_devices.errors++
        }
      }
    }

    const totalImported = Object.values(results).reduce((sum, r) => sum + r.imported, 0)
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0)

    return Response.json({
      success: true,
      results,
      summary: {
        total_imported: totalImported,
        total_errors: totalErrors,
        message: `Successfully imported ${totalImported} records${totalErrors > 0 ? ` (${totalErrors} errors)` : ""}`,
      },
    })
  } catch (error) {
    console.error("Import system data error:", error)
    return Response.json({ error: "Failed to import system data" }, { status: 500 })
  }
}
