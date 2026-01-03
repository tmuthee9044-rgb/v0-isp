import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function updateSchema() {
  try {
    console.log("[v0] Starting database schema update...")

    // Read and execute the SQL file
    const fs = await import("fs")
    const sqlContent = fs.readFileSync("./scripts/add-missing-service-columns.sql", "utf8")

    // Execute the SQL
    await sql(sqlContent)

    console.log("[v0] ✅ Successfully added missing columns to customer_services table")
    console.log(
      "[v0] ✅ Added columns: mac_address, pppoe_username, pppoe_password, lock_to_mac, auto_renew, location_id",
    )
    console.log("[v0] ✅ Added customer_auth_method column to network_devices table")
    console.log("[v0] ✅ Created performance indexes")
    console.log("[v0] ✅ Database schema update complete!")
  } catch (error) {
    console.error("[v0] ❌ Error updating schema:", error)
    throw error
  }
}

updateSchema()
