import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Offline PostgreSQL
})

async function migrateDatabase() {
  const client = await pool.connect()

  try {
    console.log("🔧 Starting database migration...")

    // Add columns to customer_services
    await client.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100),
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS location_id INTEGER;
    `)
    console.log("✅ Added columns to customer_services")

    // Add customer_auth_method to network_devices
    await client.query(`
      ALTER TABLE network_devices 
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
    `)
    console.log("✅ Added customer_auth_method to network_devices")

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
      CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
    `)
    console.log("✅ Created performance indexes")

    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('mac_address', 'pppoe_username', 'pppoe_password', 'lock_to_mac', 'auto_renew', 'location_id')
      ORDER BY column_name;
    `)

    console.log("✅ Migration complete! Added columns:")
    result.rows.forEach((row) => {
      console.log(`   - ${row.column_name} (${row.data_type})`)
    })
  } catch (error) {
    console.error("❌ Migration failed:", error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrateDatabase()
