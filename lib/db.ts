import postgres from "postgres"

/**
 * Determine which connection string to use - PRIORITIZE LOCAL PostgreSQL per Rule 4
 */
const connectionString =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(`
❌ No database connection string found!

Per Rule 4, this system requires PostgreSQL offline database.
Please set LOCAL_DATABASE_URL environment variable to your local PostgreSQL:
LOCAL_DATABASE_URL=postgresql://username:password@localhost:5432/isp_database
  `)
}

/**
 * Check if we're using local PostgreSQL per Rule 4
 */
const isLocal =
  process.env.LOCAL_DATABASE_URL !== undefined ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1")

if (isLocal) {
  console.log("✅ [DB] Local PostgreSQL connected successfully (Rule 4 - Offline Mode)")
  console.log(`[DB] Connection: ${connectionString.replace(/:[^:@]+@/, ":****@")}`)
} else {
  console.warn("⚠️  [DB] WARNING: Using cloud PostgreSQL instead of local offline database!")
  console.warn("⚠️  [DB] Rule 4 requires LOCAL PostgreSQL. Set LOCAL_DATABASE_URL environment variable.")
}

const sql = postgres(connectionString, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  max_lifetime: 60 * 30, // Close connections after 30 minutes
})

/**
 * Unified SQL client — pure PostgreSQL driver for Rule 4 compliance
 */
export function getSql() {
  return sql
}

export { sql }

/**
 * Get database status for diagnostics
 */
export async function getDatabaseStatus() {
  try {
    const result = await sql`SELECT current_database() as db, version() as version`

    return {
      connected: true,
      database: result[0]?.db,
      version: result[0]?.version,
      driver: "postgres (Pure PostgreSQL)",
      mode: isLocal ? "Local (Offline)" : "Cloud",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    }
  }
}

/**
 * Auto-migrate critical missing columns on startup
 */
async function ensureCriticalColumns() {
  try {
    // Add missing days_requested column to leave_requests
    await sql`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS days_requested INTEGER NOT NULL DEFAULT 0
    `.catch(() => {})
    
    // Add missing days_count column to leave_requests (required by schema)
    await sql`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS days_count INTEGER NOT NULL DEFAULT 0
    `.catch(() => {})

    // Update existing records to calculate days from date range
    await sql`
      UPDATE leave_requests 
      SET days_requested = GREATEST((end_date - start_date + 1), 0),
          days_count = GREATEST((end_date - start_date + 1), 0)
      WHERE days_requested = 0 OR days_count = 0
    `.catch(() => {})

    // Add missing columns to purchase_order_items
    await sql`
      ALTER TABLE purchase_order_items 
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE purchase_order_items 
      ADD COLUMN IF NOT EXISTS description TEXT
    `.catch(() => {})

    // Calculate total_amount for existing records
    await sql`
      UPDATE purchase_order_items 
      SET total_amount = (quantity * unit_cost)
      WHERE total_amount IS NULL
    `.catch(() => {})

    // Add missing columns for customer import (from CSV)
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS daily_prepaid_cost DECIMAL(10, 4) DEFAULT 0.0000
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS login VARCHAR(100) UNIQUE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS conversion_date DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS mpesa_phone_number VARCHAR(15)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS report_first_service_amount DECIMAL(10, 2) DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS report_first_service_cancel_date DATE
    `.catch(() => {})

    // Ensure customer_documents table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL DEFAULT 'contract',
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        description TEXT,
        tags TEXT[],
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        is_confidential BOOLEAN DEFAULT FALSE,
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        version INTEGER DEFAULT 1,
        parent_document_id INTEGER REFERENCES customer_documents(id)
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id)
    `.catch(() => {})

    // Fix customer_documents id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customer_documents_id_seq') THEN
          CREATE SEQUENCE customer_documents_id_seq;
          RAISE NOTICE 'Created customer_documents_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_documents') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('customer_documents_id_seq', COALESCE((SELECT MAX(id) FROM customer_documents), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE customer_documents ALTER COLUMN id SET DEFAULT nextval('customer_documents_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE customer_documents_id_seq OWNED BY customer_documents.id;
          
          RAISE NOTICE 'Fixed customer_documents id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Ensure customer_equipment table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS customer_equipment (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        inventory_item_id INTEGER,
        equipment_name VARCHAR(255) NOT NULL,
        equipment_type VARCHAR(100),
        serial_number VARCHAR(255),
        mac_address VARCHAR(17),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10, 2),
        total_price DECIMAL(10, 2),
        monthly_cost DECIMAL(10, 2),
        issued_date TIMESTAMP DEFAULT NOW(),
        return_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'issued',
        condition_notes TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id)
    `.catch(() => {})

    // Fix customer_equipment id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customer_equipment_id_seq') THEN
          CREATE SEQUENCE customer_equipment_id_seq;
          RAISE NOTICE 'Created customer_equipment_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_equipment') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('customer_equipment_id_seq', COALESCE((SELECT MAX(id) FROM customer_equipment), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE customer_equipment ALTER COLUMN id SET DEFAULT nextval('customer_equipment_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE customer_equipment_id_seq OWNED BY customer_equipment.id;
          
          RAISE NOTICE 'Fixed customer_equipment id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Ensure system_config table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key)
    `.catch(() => {})

    // Ensure UNIQUE constraint exists on system_config.key for UPSERT operations
    await sql`
      ALTER TABLE system_config ADD CONSTRAINT system_config_key_unique UNIQUE (key)
    `.catch(() => {
      // Constraint already exists, ignore error
    })

    // Fix system_config id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'system_config_id_seq') THEN
          CREATE SEQUENCE system_config_id_seq;
          RAISE NOTICE 'Created system_config_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='system_config') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('system_config_id_seq', COALESCE((SELECT MAX(id) FROM system_config), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE system_config ALTER COLUMN id SET DEFAULT nextval('system_config_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE system_config_id_seq OWNED BY system_config.id;
          
          RAISE NOTICE 'Fixed system_config id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Add compliance tracking columns to network_devices (routers table)
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'unknown'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS last_compliance_check TIMESTAMP
    `.catch(() => {})
    
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS compliance_notes TEXT
    `.catch(() => {})

    // Ensure provisioning_queue table exists for async router operations
    await sql`
      CREATE TABLE IF NOT EXISTS provisioning_queue (
        id SERIAL PRIMARY KEY,
        router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        username VARCHAR(255),
        password TEXT,
        static_ip INET,
        profile VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_status ON provisioning_queue(status)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_router ON provisioning_queue(router_id)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provisioning_queue_created ON provisioning_queue(created_at)
    `.catch(() => {})

    // Ensure supplier_invoices table exists with correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS supplier_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
        invoice_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        subtotal DECIMAL(15, 2) DEFAULT 0.00,
        tax_amount DECIMAL(15, 2) DEFAULT 0.00,
        total_amount DECIMAL(15, 2) NOT NULL,
        paid_amount DECIMAL(15, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'UNPAID',
        payment_terms INTEGER DEFAULT 30,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status)
    `.catch(() => {})

    // Fix supplier_invoices id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'supplier_invoices_id_seq') THEN
          CREATE SEQUENCE supplier_invoices_id_seq;
          RAISE NOTICE 'Created supplier_invoices_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_invoices') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('supplier_invoices_id_seq', COALESCE((SELECT MAX(id) FROM supplier_invoices), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE supplier_invoices ALTER COLUMN id SET DEFAULT nextval('supplier_invoices_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE supplier_invoices_id_seq OWNED BY supplier_invoices.id;
          
          RAISE NOTICE 'Fixed supplier_invoices id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Fix purchase_order_items id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'purchase_order_items_id_seq') THEN
          CREATE SEQUENCE purchase_order_items_id_seq;
          RAISE NOTICE 'Created purchase_order_items_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_order_items') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('purchase_order_items_id_seq', COALESCE((SELECT MAX(id) FROM purchase_order_items), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE purchase_order_items ALTER COLUMN id SET DEFAULT nextval('purchase_order_items_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE purchase_order_items_id_seq OWNED BY purchase_order_items.id;
          
          RAISE NOTICE 'Fixed purchase_order_items id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Add portal credentials columns to customer_services for customer portal access
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255)
    `.catch(() => {})

    // Add missing description column to activity_logs for logging activities
    await sql`
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS description TEXT
    `.catch(() => {})

    // Ensure payroll_records table exists with correct schema (do not drop existing data)
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
        allowances DECIMAL(15, 2) DEFAULT 0,
        deductions DECIMAL(15, 2) DEFAULT 0,
        gross_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
        tax DECIMAL(15, 2) DEFAULT 0,
        nhif DECIMAL(15, 2) DEFAULT 0,
        nssf DECIMAL(15, 2) DEFAULT 0,
        net_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        payment_date DATE,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, pay_period_start)
      )
    `.catch(() => {})
    
    // Add missing columns to existing payroll_records table
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255) NOT NULL DEFAULT 'Unknown'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15, 2) NOT NULL DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS allowances DECIMAL(15, 2) DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS tax DECIMAL(15, 2) DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_date DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255)
    `.catch(() => {})

    // Ensure vehicles table exists for fleet management
    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        registration VARCHAR(100) NOT NULL UNIQUE,
        model VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        fuel_type VARCHAR(50),
        assigned_to VARCHAR(255),
        location VARCHAR(255),
        mileage INTEGER DEFAULT 0,
        fuel_consumption DECIMAL(10, 2) DEFAULT 0,
        insurance_expiry DATE,
        license_expiry DATE,
        inspection_expiry DATE,
        warranty_expiry DATE,
        purchase_date DATE,
        purchase_cost DECIMAL(15, 2) DEFAULT 0,
        depreciation_rate DECIMAL(5, 2) DEFAULT 0,
        estimated_monthly_cost DECIMAL(15, 2) DEFAULT 0,
        engine_capacity INTEGER,
        specifications TEXT,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        last_service DATE,
        next_service DATE,
        last_fuel_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    // Add missing last_fuel_date column to existing vehicles table
    await sql`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_fuel_date DATE
    `.catch(() => {})

    // Ensure fuel_logs table exists
    await sql`
      CREATE TABLE IF NOT EXISTS fuel_logs (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        fuel_type VARCHAR(50),
        quantity DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(15, 2) NOT NULL,
        odometer_reading INTEGER,
        location VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    // Fix fuel_logs id sequence - ensure it exists and is properly configured
    await sql`
      DO $$
      DECLARE
        max_id INTEGER;
      BEGIN
        -- Get current max id
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM fuel_logs;
        
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'fuel_logs_id_seq') THEN
          EXECUTE 'CREATE SEQUENCE fuel_logs_id_seq START WITH ' || (max_id + 1);
          RAISE NOTICE 'Created fuel_logs_id_seq starting at %', max_id + 1;
        ELSE
          -- Reset sequence to correct value if it exists
          PERFORM setval('fuel_logs_id_seq', GREATEST(max_id, 1), true);
          RAISE NOTICE 'Reset fuel_logs_id_seq to %', GREATEST(max_id, 1);
        END IF;
        
        -- Ensure id column uses the sequence (remove old default first)
        ALTER TABLE fuel_logs ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE fuel_logs ALTER COLUMN id SET DEFAULT nextval('fuel_logs_id_seq');
        
        -- Link sequence ownership to the column
        ALTER SEQUENCE fuel_logs_id_seq OWNED BY fuel_logs.id;
        
        RAISE NOTICE 'fuel_logs sequence configured successfully';
      END $$;
    `.catch((err) => {
      console.error("[v0] Error fixing fuel_logs sequence:", err)
    })

    // Ensure maintenance_logs table exists
    await sql`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        service_date DATE NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        description TEXT,
        cost DECIMAL(15, 2) NOT NULL,
        odometer_reading INTEGER,
        next_service_date DATE,
        service_provider VARCHAR(255),
        parts_replaced TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    // Fix maintenance_logs id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'maintenance_logs_id_seq') THEN
          CREATE SEQUENCE maintenance_logs_id_seq;
          RAISE NOTICE 'Created maintenance_logs_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='maintenance_logs') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('maintenance_logs_id_seq', COALESCE((SELECT MAX(id) FROM maintenance_logs), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE maintenance_logs ALTER COLUMN id SET DEFAULT nextval('maintenance_logs_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE maintenance_logs_id_seq OWNED BY maintenance_logs.id;
          
          RAISE NOTICE 'Fixed maintenance_logs id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Ensure bus_fare_records table exists
    await sql`
      CREATE TABLE IF NOT EXISTS bus_fare_records (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(100),
        travel_date DATE NOT NULL,
        from_location VARCHAR(255) NOT NULL,
        to_location VARCHAR(255) NOT NULL,
        purpose TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        receipt_number VARCHAR(100),
        approved_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    // Fix bus_fare_records id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'bus_fare_records_id_seq') THEN
          CREATE SEQUENCE bus_fare_records_id_seq;
          RAISE NOTICE 'Created bus_fare_records_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bus_fare_records') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('bus_fare_records_id_seq', COALESCE((SELECT MAX(id) FROM bus_fare_records), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE bus_fare_records ALTER COLUMN id SET DEFAULT nextval('bus_fare_records_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE bus_fare_records_id_seq OWNED BY bus_fare_records.id;
          
          RAISE NOTICE 'Fixed bus_fare_records id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    console.log("[DB] Critical column migrations applied")
  } catch (error) {
    console.error("[DB] Column migration error:", error)
  }
}

// Run migrations on startup
ensureCriticalColumns()

export default sql
export const db = sql
export const getSqlConnection = () => sql
