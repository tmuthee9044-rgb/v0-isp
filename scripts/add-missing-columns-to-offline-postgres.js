import pg from "pg"
const { Pool } = pg

console.log("[v0] Connecting to OFFLINE PostgreSQL database...")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Offline database, no SSL
})

async function addMissingColumns() {
  const client = await pool.connect()

  try {
    console.log("[v0] Connected to offline PostgreSQL successfully")

    // Add missing columns to customer_services table
    console.log("[v0] Adding mac_address column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
    `)

    console.log("[v0] Adding pppoe_username column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
    `)

    console.log("[v0] Adding pppoe_password column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
    `)

    console.log("[v0] Adding lock_to_mac column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
    `)

    console.log("[v0] Adding auto_renew column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
    `)

    console.log("[v0] Adding location_id column...")
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS location_id INTEGER;
    `)

    // Add customer_auth_method to network_devices
    console.log("[v0] Adding customer_auth_method column to network_devices...")
    await client.query(`
      ALTER TABLE network_devices 
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
    `)

    // Create indexes for performance
    console.log("[v0] Creating performance indexes...")
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
      ON customer_services(mac_address);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_location_id 
      ON customer_services(location_id);
    `)

    // Verify columns were added
    console.log("[v0] Verifying columns...")
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('mac_address', 'pppoe_username', 'pppoe_password', 'lock_to_mac', 'auto_renew', 'location_id')
      ORDER BY column_name;
    `)

    console.log("[v0] Added columns:", result.rows)

    // Get total column count
    const countResult = await client.query(`
      SELECT COUNT(*) as total_columns
      FROM information_schema.columns 
      WHERE table_name = 'customer_services';
    `)

    console.log(`[v0] Total columns in customer_services: ${countResult.rows[0].total_columns}`)
    console.log("[v0] ✓ Successfully added all missing columns to offline PostgreSQL database")
  } catch (error) {
    console.error("[v0] Error adding columns:", error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

addMissingColumns()
