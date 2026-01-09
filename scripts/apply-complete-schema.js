// Apply Complete Database Schema
// This script creates all required tables for the ISP system
// Including RADIUS tables for FreeRADIUS integration

import { getSql } from "../lib/db.js"

async function applyCompleteSchema() {
  console.log("[INFO] Starting complete database schema application...")

  const sql = await getSql()

  try {
    // Read the complete schema SQL file
    const fs = await import("fs")
    const path = await import("path")
    const { fileURLToPath } = await import("url")

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const schemaPath = path.join(__dirname, "000_complete_schema.sql")

    const schemaSQL = fs.readFileSync(schemaPath, "utf8")

    console.log("[INFO] Executing complete schema...")

    // Execute the complete schema
    await sql`${schemaSQL}`

    console.log("[SUCCESS] Database schema applied successfully!")

    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    console.log(`[INFO] Total tables in database: ${tables.length}`)
    console.log("[INFO] Tables created:")
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`)
    })

    // Check for critical tables
    const criticalTables = [
      "customers",
      "service_plans",
      "customer_services",
      "payments",
      "invoices",
      "invoice_items",
      "network_devices",
      "ip_addresses",
      "employees",
      "radius_users",
      "radius_nas",
      "radius_sessions_active",
      "radius_sessions_archive",
    ]

    const existingTableNames = tables.map((t) => t.table_name)
    const missingTables = criticalTables.filter((t) => !existingTableNames.includes(t))

    if (missingTables.length > 0) {
      console.log("[WARNING] Missing critical tables:")
      missingTables.forEach((table) => {
        console.log(`  - ${table}`)
      })
    } else {
      console.log("[SUCCESS] All critical tables created successfully!")
    }
  } catch (error) {
    console.error("[ERROR] Failed to apply schema:", error.message)
    throw error
  }
}

applyCompleteSchema()
  .then(() => {
    console.log("[INFO] Schema application complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[ERROR] Schema application failed:", error)
    process.exit(1)
  })
