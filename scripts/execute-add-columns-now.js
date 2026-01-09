import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addMissingColumns() {
  console.log("Starting to add missing columns to customer_services table...\n")

  try {
    // Add connection_type column
    console.log("1. Adding connection_type column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)
    `
    console.log("   ✓ connection_type column added\n")

    // Add ip_address column
    console.log("2. Adding ip_address column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)
    `
    console.log("   ✓ ip_address column added\n")

    // Add mac_address column
    console.log("3. Adding mac_address column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(50)
    `
    console.log("   ✓ mac_address column added\n")

    // Add device_id column
    console.log("4. Adding device_id column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL
    `
    console.log("   ✓ device_id column added\n")

    // Add lock_to_mac column
    console.log("5. Adding lock_to_mac column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false
    `
    console.log("   ✓ lock_to_mac column added\n")

    // Add auto_renew column
    console.log("6. Adding auto_renew column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true
    `
    console.log("   ✓ auto_renew column added\n")

    // Add pppoe_username column
    console.log("7. Adding pppoe_username column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100)
    `
    console.log("   ✓ pppoe_username column added\n")

    // Add pppoe_password column
    console.log("8. Adding pppoe_password column...")
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255)
    `
    console.log("   ✓ pppoe_password column added\n")

    // Create indexes for performance
    console.log("9. Creating performance indexes...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address 
      ON customer_services(ip_address)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
      ON customer_services(mac_address)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username)
    `
    console.log("   ✓ Indexes created\n")

    // Verify all columns exist
    console.log("10. Verifying all columns...")
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_services' 
      AND column_name IN ('connection_type', 'ip_address', 'mac_address', 'device_id', 'lock_to_mac', 'auto_renew', 'pppoe_username', 'pppoe_password')
      ORDER BY column_name
    `

    console.log("   Columns in customer_services table:")
    columns.forEach((col) => {
      console.log(`   - ${col.column_name} (${col.data_type})`)
    })

    console.log("\n✅ SUCCESS! All columns have been added to customer_services table.")
    console.log("Both Add Service and Edit Service can now save Connection Configuration data.\n")
  } catch (error) {
    console.error("\n❌ ERROR adding columns:", error.message)
    console.error("Full error:", error)
    process.exit(1)
  }
}

addMissingColumns()
