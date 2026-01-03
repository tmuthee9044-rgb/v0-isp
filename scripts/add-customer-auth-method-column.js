import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addCustomerAuthMethodColumn() {
  try {
    console.log("[v0] Adding customer_auth_method column to network_devices table...")

    // Add customer_auth_method column if it doesn't exist
    await sql`
      ALTER TABLE network_devices 
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius'
    `

    console.log("[v0] ✓ customer_auth_method column added successfully")

    // Add index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_network_devices_customer_auth_method 
      ON network_devices(customer_auth_method)
    `

    console.log("[v0] ✓ Index created successfully")

    // Verify the column exists
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'network_devices'
      AND column_name = 'customer_auth_method'
    `

    if (result.length > 0) {
      console.log("[v0] ✓ Column verified:", result[0])
      console.log("[v0] Database is ready for router authorization method tracking")
    } else {
      console.log("[v0] ✗ Column verification failed")
    }
  } catch (error) {
    console.error("[v0] Error adding customer_auth_method column:", error)
    throw error
  }
}

addCustomerAuthMethodColumn()
