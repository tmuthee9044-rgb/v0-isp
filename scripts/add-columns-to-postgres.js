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
    console.log("[v0] Added mac_address column")

    // Add pppoe_username column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100)
    `
    console.log("[v0] Added pppoe_username column")

    // Add pppoe_password column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100)
    `
    console.log("[v0] Added pppoe_password column")

    // Add lock_to_mac column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false
    `
    console.log("[v0] Added lock_to_mac column")

    // Add auto_renew column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true
    `
    console.log("[v0] Added auto_renew column")

    // Add location_id column
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS location_id INTEGER
    `
    console.log("[v0] Added location_id column")

    // Add indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
      ON customer_services(mac_address)
    `
    console.log("[v0] Created index on mac_address")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username)
    `
    console.log("[v0] Created index on pppoe_username")

    // Add customer_auth_method to network_devices
    await sql`
      ALTER TABLE network_devices 
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius'
    `
    console.log("[v0] Added customer_auth_method to network_devices")

    // Verify the columns were added
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('mac_address', 'pppoe_username', 'pppoe_password', 'lock_to_mac', 'auto_renew', 'location_id')
      ORDER BY column_name
    `

    console.log("[v0] Verification - Columns in customer_services:")
    result.forEach((col) => {
      console.log(`[v0]   ${col.column_name}: ${col.data_type}`)
    })

    console.log("[v0] ✅ All missing columns added successfully!")
  } catch (error) {
    console.error("[v0] Error adding columns:", error)
    throw error
  }
}

addMissingColumns()
