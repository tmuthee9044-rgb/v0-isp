import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  console.log("[v0] === CREATE TABLES NOW START ===")

  const sql = neon(process.env.DATABASE_URL!)
  const results = []
  const errors = []

  const tables = [
    {
      name: "customers",
      sql: `CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        county VARCHAR(100),
        postal_code VARCHAR(20),
        customer_type VARCHAR(50) DEFAULT 'residential',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "service_plans",
      sql: `CREATE TABLE IF NOT EXISTS service_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        service_type VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        speed_download INTEGER,
        speed_upload INTEGER,
        data_limit INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "customer_services",
      sql: `CREATE TABLE IF NOT EXISTS customer_services (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        service_plan_id INTEGER REFERENCES service_plans(id),
        status VARCHAR(50) DEFAULT 'active',
        monthly_fee DECIMAL(10,2),
        start_date DATE,
        end_date DATE,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "payments",
      sql: `CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'completed',
        reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "invoices",
      sql: `CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        subtotal DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "network_devices",
      sql: `CREATE TABLE IF NOT EXISTS network_devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        location_id INTEGER,
        username VARCHAR(100),
        password VARCHAR(255),
        api_port INTEGER DEFAULT 8728,
        ssh_port INTEGER DEFAULT 22,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "ip_addresses",
      sql: `CREATE TABLE IF NOT EXISTS ip_addresses (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        subnet_mask VARCHAR(45),
        gateway VARCHAR(45),
        pool_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'available',
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        assigned_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "employees",
      sql: `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        position VARCHAR(100),
        department VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        hire_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "radius_users",
      sql: `CREATE TABLE IF NOT EXISTS radius_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) DEFAULT ':=',
        value VARCHAR(253) NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "radius_sessions_active",
      sql: `CREATE TABLE IF NOT EXISTS radius_sessions_active (
        acctsessionid VARCHAR(64) PRIMARY KEY,
        acctuniqueid VARCHAR(32) UNIQUE NOT NULL,
        username VARCHAR(64),
        nasipaddress VARCHAR(15) NOT NULL,
        nasportid VARCHAR(15),
        acctstarttime TIMESTAMP,
        acctupdatetime TIMESTAMP,
        acctstoptime TIMESTAMP,
        acctsessiontime INTEGER,
        acctinputoctets BIGINT,
        acctoutputoctets BIGINT,
        framedipaddress VARCHAR(15),
        callingstationid VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "radius_sessions_archive",
      sql: `CREATE TABLE IF NOT EXISTS radius_sessions_archive (
        id SERIAL PRIMARY KEY,
        acctsessionid VARCHAR(64),
        acctuniqueid VARCHAR(32),
        username VARCHAR(64),
        nasipaddress VARCHAR(15),
        acctstarttime TIMESTAMP,
        acctstoptime TIMESTAMP,
        acctsessiontime INTEGER,
        acctinputoctets BIGINT,
        acctoutputoctets BIGINT,
        framedipaddress VARCHAR(15),
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "radius_nas",
      sql: `CREATE TABLE IF NOT EXISTS radius_nas (
        id SERIAL PRIMARY KEY,
        nasname VARCHAR(128) UNIQUE NOT NULL,
        shortname VARCHAR(32),
        type VARCHAR(30) DEFAULT 'other',
        ports INTEGER,
        secret VARCHAR(60) NOT NULL,
        server VARCHAR(64),
        community VARCHAR(50),
        description VARCHAR(200)
      )`,
    },
  ]

  // Execute each table creation individually
  for (const table of tables) {
    try {
      console.log(`[v0] Creating table: ${table.name}`)
      await sql(table.sql)
      console.log(`[v0] ✓ Created table: ${table.name}`)
      results.push({ table: table.name, status: "success" })
    } catch (error: any) {
      console.error(`[v0] ✗ Failed to create table ${table.name}:`, error.message)
      errors.push({ table: table.name, error: error.message })
    }
  }

  // Create critical indexes for performance
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)",
    "CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)",
    "CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status)",
    "CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username)",
  ]

  console.log("[v0] Creating performance indexes...")
  for (const indexSql of indexes) {
    try {
      await sql(indexSql)
    } catch (error: any) {
      console.log(`[v0] Index already exists or error: ${error.message}`)
    }
  }

  console.log("[v0] === CREATE TABLES NOW COMPLETE ===")
  console.log(`[v0] Success: ${results.length}, Errors: ${errors.length}`)

  return NextResponse.json({
    success: errors.length === 0,
    results,
    errors,
    summary: {
      total: tables.length,
      created: results.length,
      failed: errors.length,
    },
  })
}
