import { neon } from "@neondatabase/serverless"

async function addMissingColumns() {
  console.log("🔧 Adding missing columns to customer_services table...")

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Add all missing columns
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100),
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
    `

    console.log("✅ Added missing columns to customer_services")

    // Add indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
    `

    console.log("✅ Created indexes for new columns")

    // Add customer_auth_method column to network_devices
    await sql`
      ALTER TABLE network_devices 
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
    `

    console.log("✅ Added customer_auth_method column to network_devices")

    // Verify columns exist
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('mac_address', 'pppoe_username', 'pppoe_password', 'lock_to_mac', 'auto_renew', 'location_id')
      ORDER BY column_name;
    `

    console.log("✅ Verification:", result)
    console.log("✅ All missing columns added successfully!")
  } catch (error) {
    console.error("❌ Error adding columns:", error)
    throw error
  }
}

addMissingColumns()
