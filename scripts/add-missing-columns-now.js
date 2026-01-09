import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addMissingColumns() {
  console.log("[v0] Starting to add missing columns to customer_services table...")

  try {
    // Add mac_address column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)
    `
    console.log("[v0] ✓ Added mac_address column")

    // Add pppoe_username column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255)
    `
    console.log("[v0] ✓ Added pppoe_username column")

    // Add pppoe_password column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255)
    `
    console.log("[v0] ✓ Added pppoe_password column")

    // Add lock_to_mac column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false
    `
    console.log("[v0] ✓ Added lock_to_mac column")

    // Add auto_renew column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true
    `
    console.log("[v0] ✓ Added auto_renew column")

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username)
    `
    console.log("[v0] ✓ Created index on pppoe_username")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
      ON customer_services(mac_address)
    `
    console.log("[v0] ✓ Created index on mac_address")

    console.log("\n[v0] ✅ All columns added successfully!")
    console.log("[v0] The customer_services table now has all required columns for Connection Configuration.")
  } catch (error) {
    console.error("[v0] ❌ Error adding columns:", error)
    throw error
  }
}

addMissingColumns()
