import pg from "pg"
const { Client } = pg

async function addConnectionConfigColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log("[v0] Connected to PostgreSQL database")

    // Check and add connection_type column
    console.log("[v0] Adding connection_type column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'connection_type'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN connection_type VARCHAR(50);
          COMMENT ON COLUMN customer_services.connection_type IS 'Type of connection: PPPoE, Static IP, DHCP, etc.';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ connection_type column ready")

    // Check and add ip_address column
    console.log("[v0] Adding ip_address column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'ip_address'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN ip_address VARCHAR(45);
          COMMENT ON COLUMN customer_services.ip_address IS 'Assigned IP address for the service';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ ip_address column ready")

    // Check and add mac_address column
    console.log("[v0] Adding mac_address column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'mac_address'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN mac_address VARCHAR(17);
          COMMENT ON COLUMN customer_services.mac_address IS 'MAC address of customer device';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ mac_address column ready")

    // Check and add device_id column
    console.log("[v0] Adding device_id column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'device_id'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL;
          COMMENT ON COLUMN customer_services.device_id IS 'Network device assigned to this service';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ device_id column ready")

    // Check and add lock_to_mac column
    console.log("[v0] Adding lock_to_mac column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'lock_to_mac'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN lock_to_mac BOOLEAN DEFAULT false;
          COMMENT ON COLUMN customer_services.lock_to_mac IS 'Whether to lock service to specific MAC address';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ lock_to_mac column ready")

    // Check and add auto_renew column
    console.log("[v0] Adding auto_renew column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'auto_renew'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN auto_renew BOOLEAN DEFAULT true;
          COMMENT ON COLUMN customer_services.auto_renew IS 'Whether service automatically renews';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ auto_renew column ready")

    // Check and add pppoe_username column
    console.log("[v0] Adding pppoe_username column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'pppoe_username'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN pppoe_username VARCHAR(100);
          COMMENT ON COLUMN customer_services.pppoe_username IS 'PPPoE username for authentication';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ pppoe_username column ready")

    // Check and add pppoe_password column
    console.log("[v0] Adding pppoe_password column...")
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_services' AND column_name = 'pppoe_password'
        ) THEN
          ALTER TABLE customer_services ADD COLUMN pppoe_password VARCHAR(100);
          COMMENT ON COLUMN customer_services.pppoe_password IS 'PPPoE password for authentication';
        END IF;
      END $$;
    `)
    console.log("[v0] ✓ pppoe_password column ready")

    // Create indexes for better performance
    console.log("[v0] Creating indexes...")
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address 
      ON customer_services(ip_address) 
      WHERE ip_address IS NOT NULL;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
      ON customer_services(mac_address) 
      WHERE mac_address IS NOT NULL;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username) 
      WHERE pppoe_username IS NOT NULL;
    `)
    console.log("[v0] ✓ Indexes created")

    // Verify all columns exist
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customer_services'
      ORDER BY ordinal_position;
    `)

    console.log("\n[v0] === CUSTOMER_SERVICES TABLE SCHEMA ===")
    console.log("Total columns:", result.rows.length)
    result.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ""} ${row.is_nullable === "NO" ? "NOT NULL" : "NULL"}`,
      )
    })

    console.log("\n[v0] ✅ All connection configuration columns added successfully!")
    console.log("[v0] Add Service and Edit Service will now save all data to the database.")
  } catch (error) {
    console.error("[v0] ❌ Error adding columns:", error)
    throw error
  } finally {
    await client.end()
    console.log("[v0] Database connection closed")
  }
}

addConnectionConfigColumns()
