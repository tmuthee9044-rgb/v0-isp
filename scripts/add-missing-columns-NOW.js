import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addMissingColumns() {
  console.log("[v0] Connecting to PostgreSQL database...")

  try {
    // Add all missing columns to customer_services table
    console.log("[v0] Adding connection_type column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe'`

    console.log("[v0] Adding ip_address column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`

    console.log("[v0] Adding mac_address column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)`

    console.log("[v0] Adding device_id column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS device_id INTEGER`

    console.log("[v0] Adding lock_to_mac column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false`

    console.log("[v0] Adding auto_renew column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true`

    console.log("[v0] Adding pppoe_username column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100)`

    console.log("[v0] Adding pppoe_password column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100)`

    console.log("[v0] Adding location_id column...")
    await sql`ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER`

    // Create indexes for performance
    console.log("[v0] Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_device_id ON customer_services(device_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id)`

    // Add customer_auth_method to network_devices table
    console.log("[v0] Adding customer_auth_method column to network_devices...")
    await sql`ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius'`

    // Verify columns were added
    console.log("[v0] Verifying columns...")
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN (
        'connection_type', 'ip_address', 'mac_address', 'device_id', 
        'lock_to_mac', 'auto_renew', 'pppoe_username', 'pppoe_password', 'location_id'
      )
      ORDER BY column_name
    `

    console.log("[v0] Columns added successfully:")
    result.forEach((col) => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`)
    })

    console.log("[v0] ✓ Database migration completed successfully!")
    console.log("[v0] Add Service and Edit Service will now save all connection configuration data.")
  } catch (error) {
    console.error("[v0] ERROR during migration:", error.message)
    throw error
  }
}

addMissingColumns()
