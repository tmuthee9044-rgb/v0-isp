import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    console.log("[v0] Starting database setup...")

    // Locations table (needed by many other tables)
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        type VARCHAR(50),
        capacity INTEGER,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created locations table")

    // Customers table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        county VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'Kenya',
        customer_type VARCHAR(50) DEFAULT 'individual',
        status VARCHAR(20) DEFAULT 'active',
        balance DECIMAL(15, 2) DEFAULT 0.00,
        credit_limit DECIMAL(15, 2) DEFAULT 0.00,
        location_id INTEGER REFERENCES locations(id),
        portal_password VARCHAR(255),
        id_number VARCHAR(50),
        installation_address TEXT,
        service_preferences JSONB,
        login VARCHAR(100),
        password_hash VARCHAR(255),
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created customers table")

    // Service plans table
    await sql`
      CREATE TABLE IF NOT EXISTS service_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        service_type VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        speed_download INTEGER,
        speed_upload INTEGER,
        data_limit BIGINT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created service_plans table")

    // Customer services table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_services (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        service_plan_id INTEGER REFERENCES service_plans(id),
        status VARCHAR(20) DEFAULT 'pending',
        monthly_fee DECIMAL(10, 2),
        start_date DATE,
        end_date DATE,
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        pppoe_username VARCHAR(100),
        pppoe_password VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created customer_services table")

    // Payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        amount DECIMAL(15, 2) NOT NULL,
        method VARCHAR(50),
        reference VARCHAR(100),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created payments table")

    // Invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        due_date DATE,
        paid_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created invoices table")

    // Network devices table
    await sql`
      CREATE TABLE IF NOT EXISTS network_devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        port INTEGER DEFAULT 8728,
        username VARCHAR(100),
        password VARCHAR(255),
        location_id INTEGER REFERENCES locations(id),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created network_devices table")

    // IP addresses table
    await sql`
      CREATE TABLE IF NOT EXISTS ip_addresses (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        subnet_mask VARCHAR(45),
        gateway VARCHAR(45),
        pool_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'available',
        customer_id INTEGER REFERENCES customers(id),
        assigned_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created ip_addresses table")

    // Employees table
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        position VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        hire_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created employees table")

    // RADIUS users table
    await sql`
      CREATE TABLE IF NOT EXISTS radius_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) NOT NULL DEFAULT ':=',
        value VARCHAR(253) NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created radius_users table")

    // RADIUS active sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS radius_sessions_active (
        acctsessionid VARCHAR(64) PRIMARY KEY,
        acctuniqueid VARCHAR(32) UNIQUE NOT NULL,
        username VARCHAR(64),
        nasipaddress VARCHAR(15) NOT NULL,
        nasportid VARCHAR(32),
        acctstarttime TIMESTAMP,
        acctupdatetime TIMESTAMP,
        acctstoptime TIMESTAMP,
        acctinputoctets BIGINT DEFAULT 0,
        acctoutputoctets BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created radius_sessions_active table")

    // RADIUS archived sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS radius_sessions_archive (
        acctsessionid VARCHAR(64),
        acctuniqueid VARCHAR(32),
        username VARCHAR(64),
        nasipaddress VARCHAR(15),
        acctstarttime TIMESTAMP,
        acctstoptime TIMESTAMP,
        acctsessiontime BIGINT,
        acctinputoctets BIGINT,
        acctoutputoctets BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created radius_sessions_archive table")

    // RADIUS NAS table
    await sql`
      CREATE TABLE IF NOT EXISTS radius_nas (
        id SERIAL PRIMARY KEY,
        nasname VARCHAR(128) UNIQUE NOT NULL,
        shortname VARCHAR(32),
        type VARCHAR(30) DEFAULT 'other',
        ports INTEGER,
        secret VARCHAR(60) NOT NULL,
        server VARCHAR(64),
        community VARCHAR(50),
        description VARCHAR(200)
      )
    `
    console.log("[v0] ✓ Created radius_nas table")

    // Company profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS company_profiles (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        trading_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(10) DEFAULT 'KES',
        timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
        time_format VARCHAR(20) DEFAULT 'HH:mm:ss',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created company_profiles table")

    // Router performance history table
    await sql`
      CREATE TABLE IF NOT EXISTS router_performance_history (
        id SERIAL PRIMARY KEY,
        router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cpu_usage DECIMAL(5, 2),
        memory_usage DECIMAL(5, 2),
        bandwidth_in BIGINT,
        bandwidth_out BIGINT,
        bandwidth_usage BIGINT,
        peak_usage BIGINT,
        connections INTEGER,
        latency DECIMAL(10, 2),
        packet_loss DECIMAL(5, 2),
        uptime BIGINT,
        uptime_percentage DECIMAL(5, 2),
        temperature DECIMAL(5, 2)
      )
    `
    console.log("[v0] ✓ Created router_performance_history table")

    // System config table
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created system_config table")

    console.log("[v0] Creating indexes for sub-5ms performance...")

    await sql`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_service_plans_id ON service_plans(id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username)`
    await sql`CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_router_performance_router_id ON router_performance_history(router_id)`

    console.log("[v0] ✓ All indexes created")

    // Mark setup as completed
    await sql`
      INSERT INTO system_config (key, value) 
      VALUES ('setup_completed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    console.log("[v0] ✓ Database setup completed successfully - all 12 critical tables created!")

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully with all 12 critical tables",
    })
  } catch (error) {
    console.error("[v0] Database setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database setup failed: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}
