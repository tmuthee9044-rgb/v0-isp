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
    // Use an advisory lock to prevent concurrent startup migrations causing deadlocks
    const lockResult = await sql`SELECT pg_try_advisory_lock(hashtext('ensure_critical_columns')) as acquired`
    if (!lockResult[0]?.acquired) {
      console.log("[DB] Another instance is running migrations, skipping")
      return
    }

    // Ensure FreeRADIUS tables exist (radacct, radcheck, radreply, radpostauth, nas, etc.)
    await sql`
      CREATE TABLE IF NOT EXISTS radacct (
        RadAcctId           BIGSERIAL PRIMARY KEY,
        AcctSessionId       TEXT NOT NULL DEFAULT '',
        AcctUniqueId        TEXT NOT NULL DEFAULT '',
        UserName            TEXT,
        GroupName           TEXT,
        Realm               TEXT,
        NASIPAddress        INET,
        NASPortId           TEXT,
        NASPortType         TEXT,
        AcctStartTime       TIMESTAMP WITH TIME ZONE,
        AcctUpdateTime      TIMESTAMP WITH TIME ZONE,
        AcctStopTime        TIMESTAMP WITH TIME ZONE,
        AcctInterval        BIGINT,
        AcctSessionTime     BIGINT,
        AcctAuthentic       TEXT,
        ConnectInfo_start   TEXT,
        ConnectInfo_stop    TEXT,
        AcctInputOctets     BIGINT,
        AcctOutputOctets    BIGINT,
        CalledStationId     TEXT,
        CallingStationId    TEXT,
        AcctTerminateCause  TEXT,
        ServiceType         TEXT,
        FramedProtocol      TEXT,
        FramedIPAddress     INET,
        FramedIPv6Address   INET,
        FramedIPv6Prefix    INET,
        FramedInterfaceId   TEXT,
        DelegatedIPv6Prefix INET
      )
    `.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS radacct_active_session_idx ON radacct (AcctUniqueId) WHERE AcctStopTime IS NULL`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS radacct_start_user_idx ON radacct (AcctStartTime, UserName)`.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radcheck (
        id          SERIAL PRIMARY KEY,
        UserName    TEXT NOT NULL DEFAULT '',
        Attribute   TEXT NOT NULL DEFAULT '',
        op          VARCHAR(2) NOT NULL DEFAULT '==',
        Value       TEXT NOT NULL DEFAULT ''
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radreply (
        id          SERIAL PRIMARY KEY,
        UserName    TEXT NOT NULL DEFAULT '',
        Attribute   TEXT NOT NULL DEFAULT '',
        op          VARCHAR(2) NOT NULL DEFAULT '=',
        Value       TEXT NOT NULL DEFAULT ''
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radgroupcheck (
        id          SERIAL PRIMARY KEY,
        GroupName   TEXT NOT NULL DEFAULT '',
        Attribute   TEXT NOT NULL DEFAULT '',
        op          VARCHAR(2) NOT NULL DEFAULT '==',
        Value       TEXT NOT NULL DEFAULT ''
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radgroupreply (
        id          SERIAL PRIMARY KEY,
        GroupName   TEXT NOT NULL DEFAULT '',
        Attribute   TEXT NOT NULL DEFAULT '',
        op          VARCHAR(2) NOT NULL DEFAULT '=',
        Value       TEXT NOT NULL DEFAULT ''
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radusergroup (
        id          SERIAL PRIMARY KEY,
        UserName    TEXT NOT NULL DEFAULT '',
        GroupName   TEXT NOT NULL DEFAULT '',
        priority    INTEGER NOT NULL DEFAULT 0
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS radpostauth (
        id                  BIGSERIAL PRIMARY KEY,
        username            TEXT NOT NULL,
        pass                TEXT,
        reply               TEXT,
        CalledStationId     TEXT,
        CallingStationId    TEXT,
        authdate            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS nas (
        id          SERIAL PRIMARY KEY,
        nasname     TEXT NOT NULL,
        shortname   TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'other',
        ports       INTEGER,
        secret      TEXT NOT NULL,
        server      TEXT,
        community   TEXT,
        description TEXT
      )
    `.catch(() => {})

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
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS splynx_addon_agents_agent VARCHAR(255)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS splynx_addon_resellers_reseller VARCHAR(255)
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

    // Fix account_balances id sequence and ensure status column exists
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'account_balances_id_seq') THEN
          CREATE SEQUENCE account_balances_id_seq;
          RAISE NOTICE 'Created account_balances_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='account_balances') THEN
          PERFORM setval('account_balances_id_seq', COALESCE((SELECT MAX(id) FROM account_balances), 0) + 1, false);
          ALTER TABLE account_balances ALTER COLUMN id SET DEFAULT nextval('account_balances_id_seq');
          ALTER SEQUENCE account_balances_id_seq OWNED BY account_balances.id;
          RAISE NOTICE 'Fixed account_balances id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    await sql`
      ALTER TABLE account_balances ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `.catch(() => {})

    await sql`
      ALTER TABLE account_balances ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW()
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

    // Ensure payroll_records table exists with correct schema matching 030_create_payroll_tables.sql
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(20) NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        period VARCHAR(7) NOT NULL,
        basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
        allowances DECIMAL(12, 2) NOT NULL DEFAULT 0,
        overtime DECIMAL(12, 2) NOT NULL DEFAULT 0,
        gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
        paye DECIMAL(12, 2) NOT NULL DEFAULT 0,
        nssf DECIMAL(12, 2) NOT NULL DEFAULT 0,
        sha DECIMAL(12, 2) NOT NULL DEFAULT 0,
        other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
        net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        processed_by VARCHAR(100),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, period)
      )
    `.catch(() => {})
    
    // Add missing columns to existing payroll_records table (in case it already exists)
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255) NOT NULL DEFAULT 'Unknown'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime DECIMAL(12, 2) NOT NULL DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS processed_by VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP
    `.catch(() => {})

    // Fix finance_audit_trail: drop NOT NULL on action_type and set default
    await sql`
      ALTER TABLE finance_audit_trail ALTER COLUMN action_type SET DEFAULT 'unknown'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE finance_audit_trail ALTER COLUMN action_type DROP NOT NULL
    `.catch(() => {})

    // Update any existing NULL action_type values
    await sql`
      UPDATE finance_audit_trail SET action_type = COALESCE(action, 'unknown') WHERE action_type IS NULL
    `.catch(() => {})

    // Recreate the trigger function to properly set both action and action_type
    await sql`
      CREATE OR REPLACE FUNCTION finance_audit_trigger_function()
      RETURNS TRIGGER AS $fn$
      DECLARE
          v_user_id INTEGER;
          v_ip_address INET;
      BEGIN
          BEGIN
              v_user_id := current_setting('app.current_user_id', true)::INTEGER;
          EXCEPTION WHEN OTHERS THEN
              v_user_id := NULL;
          END;
          BEGIN
              v_ip_address := current_setting('app.client_ip', true)::INET;
          EXCEPTION WHEN OTHERS THEN
              v_ip_address := NULL;
          END;

          IF TG_OP = 'DELETE' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, old_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', 'DELETE', row_to_json(OLD), v_user_id, v_ip_address, NOW());
              RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, old_values, new_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', 'UPDATE', row_to_json(OLD), row_to_json(NEW), v_user_id, v_ip_address, NOW());
              RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, new_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', 'INSERT', row_to_json(NEW), v_user_id, v_ip_address, NOW());
              RETURN NEW;
          END IF;
          RETURN NULL;
      END;
      $fn$ LANGUAGE plpgsql
    `.catch(() => {})

    // Also recreate the log_finance_audit function (some triggers may reference this name)
    await sql`
      CREATE OR REPLACE FUNCTION log_finance_audit()
      RETURNS TRIGGER AS $fn$
      DECLARE
          v_user_id INTEGER;
          v_ip_address INET;
      BEGIN
          BEGIN
              v_user_id := current_setting('app.current_user_id', true)::INTEGER;
          EXCEPTION WHEN OTHERS THEN
              v_user_id := NULL;
          END;
          BEGIN
              v_ip_address := current_setting('app.client_ip', true)::INET;
          EXCEPTION WHEN OTHERS THEN
              v_ip_address := NULL;
          END;

          IF TG_OP = 'DELETE' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, old_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', 'DELETE', row_to_json(OLD), v_user_id, v_ip_address, NOW());
              RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, old_values, new_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', 'UPDATE', row_to_json(OLD), row_to_json(NEW), v_user_id, v_ip_address, NOW());
              RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
              INSERT INTO finance_audit_trail (table_name, record_id, action, action_type, new_values, user_id, ip_address, created_at)
              VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', 'INSERT', row_to_json(NEW), v_user_id, v_ip_address, NOW());
              RETURN NEW;
          END IF;
          RETURN NULL;
      END;
      $fn$ LANGUAGE plpgsql
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

    // ========== Add ALL missing columns to customer_services table ==========
    // These columns are required by addCustomerService and service provisioning
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_id BIGINT
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'pppoe'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(50) DEFAULT 'radius'
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id BIGINT
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS installation_date DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS device_id VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS config_id INTEGER
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS end_date DATE
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_sync_status VARCHAR(50)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `.catch(() => {})
    
    await sql`
      ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `.catch(() => {})

    // Create indexes for customer_services performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_router_id ON customer_services(router_id)
    `.catch(() => {})
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id)
    `.catch(() => {})
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address)
    `.catch(() => {})
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_auth_method ON customer_services(auth_method)
    `.catch(() => {})

    // Add unique constraint on pppoe_username for internet services (Rule 1 - no duplicate PPPoE usernames)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_services_pppoe_username_unique 
      ON customer_services(pppoe_username) 
      WHERE pppoe_username IS NOT NULL AND status IN ('active', 'pending', 'suspended')
    `.catch(() => {})

    // Add vendor field to network_devices for multi-vendor RADIUS support
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS vendor VARCHAR(50) DEFAULT 'mikrotik'
    `.catch(() => {})
    
    // Add radius_secret field for per-router RADIUS secrets
    await sql`
      ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255)
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
    // Uses advisory lock to prevent deadlock from concurrent startup
    await sql`
      DO $$
      DECLARE
        max_id INTEGER;
        current_default TEXT;
      BEGIN
        -- Advisory lock to prevent concurrent sequence fixes (key: hashtext('fuel_logs_seq_fix'))
        PERFORM pg_advisory_lock(hashtext('fuel_logs_seq_fix'));
        
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
          END IF;
          
          -- Only alter default if not already set to this sequence
          SELECT pg_get_expr(adbin, adrelid) INTO current_default
          FROM pg_attrdef
          JOIN pg_attribute ON pg_attrdef.adrelid = pg_attribute.attrelid AND pg_attrdef.adnum = pg_attribute.attnum
          WHERE pg_attribute.attrelid = 'fuel_logs'::regclass AND pg_attribute.attname = 'id';
          
          IF current_default IS NULL OR current_default NOT LIKE '%fuel_logs_id_seq%' THEN
            ALTER TABLE fuel_logs ALTER COLUMN id SET DEFAULT nextval('fuel_logs_id_seq');
            ALTER SEQUENCE fuel_logs_id_seq OWNED BY fuel_logs.id;
            RAISE NOTICE 'fuel_logs sequence configured successfully';
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'fuel_logs sequence fix skipped: %', SQLERRM;
        END;
        
        -- Release advisory lock
        PERFORM pg_advisory_unlock(hashtext('fuel_logs_seq_fix'));
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

    // Ensure customer_statements table exists for billing statements
    await sql`
      CREATE TABLE IF NOT EXISTS customer_statements (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        statement_number VARCHAR(100) UNIQUE NOT NULL,
        statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        total_charges DECIMAL(15, 2) DEFAULT 0,
        total_payments DECIMAL(15, 2) DEFAULT 0,
        closing_balance DECIMAL(15, 2) DEFAULT 0,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_statements_customer_id ON customer_statements(customer_id)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_statements_date ON customer_statements(statement_date)
    `.catch(() => {})

    // Fix customer_statements id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customer_statements_id_seq') THEN
          CREATE SEQUENCE customer_statements_id_seq;
          RAISE NOTICE 'Created customer_statements_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_statements') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('customer_statements_id_seq', COALESCE((SELECT MAX(id) FROM customer_statements), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE customer_statements ALTER COLUMN id SET DEFAULT nextval('customer_statements_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE customer_statements_id_seq OWNED BY customer_statements.id;
          
          RAISE NOTICE 'Fixed customer_statements id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Ensure credit_applications table exists for customer credit requests
    await sql`
      CREATE TABLE IF NOT EXISTS credit_applications (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        application_date DATE NOT NULL DEFAULT CURRENT_DATE,
        requested_amount DECIMAL(15, 2) NOT NULL,
        approved_amount DECIMAL(15, 2) DEFAULT 0,
        credit_limit DECIMAL(15, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        approval_date DATE,
        approved_by INTEGER,
        rejection_reason TEXT,
        repayment_period INTEGER,
        interest_rate DECIMAL(5, 2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_credit_applications_customer_id ON credit_applications(customer_id)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_credit_applications_status ON credit_applications(status)
    `.catch(() => {})

    // Fix credit_applications id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        -- Create sequence if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'credit_applications_id_seq') THEN
          CREATE SEQUENCE credit_applications_id_seq;
          RAISE NOTICE 'Created credit_applications_id_seq';
        END IF;
        
        -- If table exists, ensure id column uses the sequence
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='credit_applications') THEN
          -- Set sequence to max existing id + 1
          PERFORM setval('credit_applications_id_seq', COALESCE((SELECT MAX(id) FROM credit_applications), 0) + 1, false);
          
          -- Set the default value for id column to use the sequence
          ALTER TABLE credit_applications ALTER COLUMN id SET DEFAULT nextval('credit_applications_id_seq');
          
          -- Link sequence ownership to the column
          ALTER SEQUENCE credit_applications_id_seq OWNED BY credit_applications.id;
          
          RAISE NOTICE 'Fixed credit_applications id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Add missing columns to radpostauth for RADIUS logs
    await sql`
      ALTER TABLE radpostauth ADD COLUMN IF NOT EXISTS calledstationid VARCHAR(50)
    `.catch(() => {})
    
    await sql`
      ALTER TABLE radpostauth ADD COLUMN IF NOT EXISTS callingstationid VARCHAR(50)
    `.catch(() => {})

    // Ensure system_logs table exists for application logging
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        level VARCHAR(20) NOT NULL,
        source VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        ip_address INET,
        user_id VARCHAR(255),
        customer_id VARCHAR(255),
        details JSONB,
        session_id VARCHAR(255),
        user_agent TEXT
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category)
    `.catch(() => {})

    // Fix users id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_id_seq') THEN
          CREATE SEQUENCE users_id_seq;
          RAISE NOTICE 'Created users_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
          PERFORM setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
          ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
          ALTER SEQUENCE users_id_seq OWNED BY users.id;
          RAISE NOTICE 'Fixed users id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Fix purchase_orders id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'purchase_orders_id_seq') THEN
          CREATE SEQUENCE purchase_orders_id_seq;
          RAISE NOTICE 'Created purchase_orders_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') THEN
          PERFORM setval('purchase_orders_id_seq', COALESCE((SELECT MAX(id) FROM purchase_orders), 0) + 1, false);
          ALTER TABLE purchase_orders ALTER COLUMN id SET DEFAULT nextval('purchase_orders_id_seq');
          ALTER SEQUENCE purchase_orders_id_seq OWNED BY purchase_orders.id;
          RAISE NOTICE 'Fixed purchase_orders id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Fix purchase_order_items id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'purchase_order_items_id_seq') THEN
          CREATE SEQUENCE purchase_order_items_id_seq;
          RAISE NOTICE 'Created purchase_order_items_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_order_items') THEN
          PERFORM setval('purchase_order_items_id_seq', COALESCE((SELECT MAX(id) FROM purchase_order_items), 0) + 1, false);
          ALTER TABLE purchase_order_items ALTER COLUMN id SET DEFAULT nextval('purchase_order_items_id_seq');
          ALTER SEQUENCE purchase_order_items_id_seq OWNED BY purchase_order_items.id;
          RAISE NOTICE 'Fixed purchase_order_items id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Fix activity_logs id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'activity_logs_id_seq') THEN
          CREATE SEQUENCE activity_logs_id_seq;
          RAISE NOTICE 'Created activity_logs_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='activity_logs') THEN
          PERFORM setval('activity_logs_id_seq', COALESCE((SELECT MAX(id) FROM activity_logs), 0) + 1, false);
          ALTER TABLE activity_logs ALTER COLUMN id SET DEFAULT nextval('activity_logs_id_seq');
          ALTER SEQUENCE activity_logs_id_seq OWNED BY activity_logs.id;
          RAISE NOTICE 'Fixed activity_logs id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Fix employees id sequence if table exists but sequence is broken
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'employees_id_seq') THEN
          CREATE SEQUENCE employees_id_seq;
          RAISE NOTICE 'Created employees_id_seq';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='employees') THEN
          PERFORM setval('employees_id_seq', COALESCE((SELECT MAX(id) FROM employees), 0) + 1, false);
          ALTER TABLE employees ALTER COLUMN id SET DEFAULT nextval('employees_id_seq');
          ALTER SEQUENCE employees_id_seq OWNED BY employees.id;
          RAISE NOTICE 'Fixed employees id sequence';
        END IF;
      END $$;
    `.catch(() => {})

    // Add missing columns to suppliers table
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya'`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50) DEFAULT 'general'`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2) DEFAULT 0`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`.catch(() => {})

    console.log("[DB] Critical column migrations applied")
  } catch (error) {
    console.error("[DB] Column migration error:", error)
  } finally {
    // Always release the advisory lock
    await sql`SELECT pg_advisory_unlock(hashtext('ensure_critical_columns'))`.catch(() => {})
  }
}

// Run migrations on startup
ensureCriticalColumns()

export default sql
export const db = sql
export const getSqlConnection = () => sql
