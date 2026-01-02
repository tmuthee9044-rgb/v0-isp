#!/usr/bin/env node

const { neon } = require("@neondatabase/serverless")

async function main() {
  console.log("🚀 Adding missing columns to customer_services table...")

  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Add all missing columns
    console.log(
      "📝 Adding columns: pppoe_username, pppoe_password, mac_address, lock_to_mac, auto_renew, connection_type",
    )

    await sql`
      ALTER TABLE customer_services
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe'
    `

    console.log("✅ Columns added successfully")

    // Create indexes for performance
    console.log("📊 Creating performance indexes...")

    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address)`

    console.log("✅ Indexes created")

    // Update existing services
    console.log("🔄 Updating existing services with default values...")

    await sql`UPDATE customer_services SET connection_type = 'pppoe' WHERE connection_type IS NULL`

    console.log("✅ Existing services updated")

    // Verify the schema
    console.log("🔍 Verifying schema...")

    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customer_services'
      AND column_name IN ('pppoe_username', 'pppoe_password', 'mac_address', 'lock_to_mac', 'auto_renew', 'connection_type')
      ORDER BY column_name
    `

    console.log("✅ Schema verification:")
    columns.forEach((col) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Check RADIUS tables
    console.log("🔍 Checking RADIUS tables...")

    const radiusTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('radcheck', 'radreply', 'radacct', 'nas', 'radius_users')
      ORDER BY table_name
    `

    console.log("✅ RADIUS tables found:")
    radiusTables.forEach((table) => {
      console.log(`   - ${table.table_name}`)
    })

    // Test a sample service with RADIUS provisioning
    console.log("🧪 Testing service-to-RADIUS flow...")

    const activeServices = await sql`
      SELECT cs.id, cs.customer_id, cs.pppoe_username, cs.status, sp.download_speed, sp.upload_speed
      FROM customer_services cs
      LEFT JOIN service_plans sp ON sp.id = cs.service_plan_id
      WHERE cs.status = 'active'
      LIMIT 1
    `

    if (activeServices.length > 0) {
      const service = activeServices[0]
      console.log(`   Found active service: ID ${service.id}, Customer ${service.customer_id}`)

      // Check if it has RADIUS credentials
      const radiusCheck = await sql`
        SELECT username, attribute, value
        FROM radcheck
        WHERE username = ${service.pppoe_username || `customer_${service.customer_id}`}
        LIMIT 3
      `

      if (radiusCheck.length > 0) {
        console.log(`   ✅ Service has RADIUS credentials:`)
        radiusCheck.forEach((r) => {
          console.log(`      ${r.attribute}: ${r.value}`)
        })
      } else {
        console.log(`   ⚠️  Service does not have RADIUS credentials yet`)
        console.log(`   💡 Credentials will be created when customer pays or service is activated`)
      }
    } else {
      console.log("   ℹ️  No active services found to test")
    }

    console.log("\n🎉 SUCCESS! All columns added and verified.")
    console.log("✨ System is ready to:")
    console.log("   1. Save PPPoE credentials when creating/editing services")
    console.log("   2. Store MAC addresses for device binding")
    console.log("   3. Manage auto-renewal settings")
    console.log("   4. Provision credentials to FreeRADIUS for physical router authentication")
    console.log("\n📝 Next steps:")
    console.log("   - Create/edit a service to test the complete flow")
    console.log("   - Check /logs to verify RADIUS authentication attempts")
    console.log("   - Verify customers can authenticate on the physical router")
  } catch (error) {
    console.error("❌ ERROR:", error.message)
    console.error("Full error:", error)
    process.exit(1)
  }
}

main()
