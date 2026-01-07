import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  console.log("[v0] === INITIALIZING DATABASE ===")

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const tables = [
      {
        name: "customers",
        sql: `
          CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            account_number VARCHAR(50) UNIQUE NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            county VARCHAR(100),
            postal_code VARCHAR(20),
            customer_type VARCHAR(50) DEFAULT 'residential',
            status VARCHAR(50) DEFAULT 'active',
            id_number VARCHAR(50),
            national_id VARCHAR(50),
            installation_address TEXT,
            portal_password VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
          CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
          CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
        `,
      },
      {
        name: "service_plans",
        sql: `
          CREATE TABLE IF NOT EXISTS service_plans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            service_type VARCHAR(50) DEFAULT 'internet',
            speed_download INTEGER,
            speed_upload INTEGER,
            price DECIMAL(10,2) NOT NULL,
            billing_cycle VARCHAR(50) DEFAULT 'monthly',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_service_plans_status ON service_plans(status);
        `,
      },
      {
        name: "customer_services",
        sql: `
          CREATE TABLE IF NOT EXISTS customer_services (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            service_plan_id INTEGER REFERENCES service_plans(id),
            status VARCHAR(50) DEFAULT 'active',
            monthly_fee DECIMAL(10,2),
            start_date DATE,
            end_date DATE,
            ip_address VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
          CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
        `,
      },
      {
        name: "payments",
        sql: `
          CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            amount DECIMAL(10,2) NOT NULL,
            payment_date DATE NOT NULL,
            method VARCHAR(50),
            reference VARCHAR(255),
            status VARCHAR(50) DEFAULT 'completed',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
          CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
        `,
      },
      {
        name: "invoices",
        sql: `
          CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            subtotal DECIMAL(10,2) DEFAULT 0,
            tax_amount DECIMAL(10,2) DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'unpaid',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
          CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
        `,
      },
      {
        name: "network_devices",
        sql: `
          CREATE TABLE IF NOT EXISTS network_devices (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) DEFAULT 'router',
            ip_address VARCHAR(50),
            status VARCHAR(50) DEFAULT 'active',
            location_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
        `,
      },
      {
        name: "ip_addresses",
        sql: `
          CREATE TABLE IF NOT EXISTS ip_addresses (
            id SERIAL PRIMARY KEY,
            ip_address VARCHAR(50) UNIQUE NOT NULL,
            subnet_mask VARCHAR(50),
            gateway VARCHAR(50),
            status VARCHAR(50) DEFAULT 'available',
            customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
          CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id);
        `,
      },
      {
        name: "employees",
        sql: `
          CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50),
            position VARCHAR(100),
            department VARCHAR(100),
            hire_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
          CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
        `,
      },
      {
        name: "radius_users",
        sql: `
          CREATE TABLE IF NOT EXISTS radius_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            password VARCHAR(128) NOT NULL,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
          CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id);
        `,
      },
      {
        name: "radius_sessions_active",
        sql: `
          CREATE TABLE IF NOT EXISTS radius_sessions_active (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) NOT NULL,
            nas_ip_address VARCHAR(50),
            session_id VARCHAR(128) UNIQUE,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            bytes_in BIGINT DEFAULT 0,
            bytes_out BIGINT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
          CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_session_id ON radius_sessions_active(session_id);
        `,
      },
      {
        name: "radius_sessions_archive",
        sql: `
          CREATE TABLE IF NOT EXISTS radius_sessions_archive (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) NOT NULL,
            nas_ip_address VARCHAR(50),
            session_id VARCHAR(128),
            start_time TIMESTAMP,
            stop_time TIMESTAMP,
            session_duration INTEGER,
            bytes_in BIGINT DEFAULT 0,
            bytes_out BIGINT DEFAULT 0,
            terminate_cause VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
          CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_start_time ON radius_sessions_archive(start_time);
        `,
      },
      {
        name: "radius_nas",
        sql: `
          CREATE TABLE IF NOT EXISTS radius_nas (
            id SERIAL PRIMARY KEY,
            nasname VARCHAR(128) UNIQUE NOT NULL,
            shortname VARCHAR(32),
            type VARCHAR(30) DEFAULT 'other',
            ports INTEGER,
            secret VARCHAR(60) NOT NULL,
            server VARCHAR(64),
            community VARCHAR(50),
            description VARCHAR(200),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_radius_nas_nasname ON radius_nas(nasname);
        `,
      },
    ]

    const results = []

    for (const table of tables) {
      try {
        console.log(`[v0] Creating table: ${table.name}`)
        await sql(table.sql)
        console.log(`[v0] ✓ Table ${table.name} created successfully`)
        results.push({ table: table.name, status: "success" })
      } catch (error: any) {
        console.error(`[v0] ✗ Error creating table ${table.name}:`, error.message)
        results.push({ table: table.name, status: "error", error: error.message })
      }
    }

    const additionalTables = [
      {
        name: "company_profiles",
        sql: `
          CREATE TABLE IF NOT EXISTS company_profiles (
            id SERIAL PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            trading_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            country VARCHAR(100),
            language VARCHAR(10) DEFAULT 'en',
            currency VARCHAR(10) DEFAULT 'USD',
            timezone VARCHAR(100) DEFAULT 'UTC',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
      },
      {
        name: "router_performance_history",
        sql: `
          CREATE TABLE IF NOT EXISTS router_performance_history (
            id SERIAL PRIMARY KEY,
            router_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cpu_usage DECIMAL(5,2),
            memory_usage DECIMAL(5,2),
            bandwidth_in BIGINT,
            bandwidth_out BIGINT,
            bandwidth_usage BIGINT,
            peak_usage BIGINT,
            connections INTEGER,
            latency DECIMAL(10,2),
            packet_loss DECIMAL(5,2),
            uptime_percentage DECIMAL(5,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_router_performance_history_router_id ON router_performance_history(router_id);
          CREATE INDEX IF NOT EXISTS idx_router_performance_history_timestamp ON router_performance_history(timestamp);
        `,
      },
    ]

    for (const table of additionalTables) {
      try {
        console.log(`[v0] Creating table: ${table.name}`)
        await sql(table.sql)
        console.log(`[v0] ✓ Table ${table.name} created successfully`)
        results.push({ table: table.name, status: "success" })
      } catch (error: any) {
        console.error(`[v0] ✗ Error creating table ${table.name}:`, error.message)
        results.push({ table: table.name, status: "error", error: error.message })
      }
    }

    const successCount = results.filter((r) => r.status === "success").length
    const errorCount = results.filter((r) => r.status === "error").length

    console.log(`[v0] Database initialization complete: ${successCount} tables created, ${errorCount} errors`)

    return NextResponse.json({
      success: errorCount === 0,
      message: `Database initialized: ${successCount} tables created, ${errorCount} errors`,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Database initialization error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
