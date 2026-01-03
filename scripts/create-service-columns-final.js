import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function createColumns() {
  try {
    console.log("[v0] Starting to add columns to customer_services table...")

    // Add all missing columns with proper types
    await sql`
      ALTER TABLE customer_services
      ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe',
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
      ADD COLUMN IF NOT EXISTS device_id INTEGER,
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
    `

    console.log("[v0] Successfully added all columns")

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address 
      ON customer_services(ip_address);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username);
    `

    console.log("[v0] Successfully created indexes")

    // Verify columns exist
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('connection_type', 'ip_address', 'mac_address', 'device_id', 'lock_to_mac', 'auto_renew', 'pppoe_username', 'pppoe_password')
      ORDER BY column_name;
    `

    console.log("[v0] Verified columns:", result)

    return { success: true, columns: result }
  } catch (error) {
    console.error("[v0] Error adding columns:", error)
    throw error
  }
}

createColumns()
