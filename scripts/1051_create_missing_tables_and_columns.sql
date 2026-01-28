-- =====================================================
-- Create Missing Tables and Columns
-- This script creates tables that don't exist and adds missing columns
-- =====================================================

-- =====================================================
-- 1. RADIUS TABLES
-- =====================================================

-- Create radius_nas table (Network Access Servers)
CREATE TABLE IF NOT EXISTS radius_nas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nasname VARCHAR(128) NOT NULL,
    shortname VARCHAR(32),
    type VARCHAR(30) DEFAULT 'other',
    ports INTEGER,
    secret VARCHAR(60) NOT NULL,
    server VARCHAR(64),
    community VARCHAR(50),
    description VARCHAR(200),
    location_id UUID REFERENCES locations(id),
    monitoring_enabled BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create radius_sessions_active table
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) UNIQUE NOT NULL,
    username VARCHAR(64) NOT NULL,
    nas_ip_address VARCHAR(45),
    nas_port_id VARCHAR(50),
    framed_ip_address VARCHAR(45),
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    acct_session_time INTEGER DEFAULT 0,
    acct_input_octets BIGINT DEFAULT 0,
    acct_output_octets BIGINT DEFAULT 0,
    acct_input_gigawords INTEGER DEFAULT 0,
    acct_output_gigawords INTEGER DEFAULT 0,
    acct_start_time TIMESTAMP WITH TIME ZONE,
    acct_update_time TIMESTAMP WITH TIME ZONE,
    acct_terminate_cause VARCHAR(32),
    customer_id UUID REFERENCES customers(id),
    service_id UUID REFERENCES customer_services(id),
    nas_id UUID REFERENCES radius_nas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create radius_accounting table if not exists
CREATE TABLE IF NOT EXISTS radius_accounting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    nas_ip_address VARCHAR(45),
    nas_port_id VARCHAR(50),
    framed_ip_address VARCHAR(45),
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    acct_status_type VARCHAR(25),
    acct_session_time INTEGER DEFAULT 0,
    acct_input_octets BIGINT DEFAULT 0,
    acct_output_octets BIGINT DEFAULT 0,
    acct_input_gigawords INTEGER DEFAULT 0,
    acct_output_gigawords INTEGER DEFAULT 0,
    acct_start_time TIMESTAMP WITH TIME ZONE,
    acct_stop_time TIMESTAMP WITH TIME ZONE,
    acct_terminate_cause VARCHAR(32),
    customer_id UUID REFERENCES customers(id),
    service_id UUID REFERENCES customer_services(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TAX AND AUDIT TABLES
-- =====================================================

-- Create tax_records table
CREATE TABLE IF NOT EXISTS tax_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type VARCHAR(50) NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    applies_to VARCHAR(50) DEFAULT 'all',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table (general system audit)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to network_devices if they don't exist
DO $$
BEGIN
    -- location_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'network_devices' AND column_name = 'location_id') THEN
        ALTER TABLE network_devices ADD COLUMN location_id UUID REFERENCES locations(id);
    END IF;
    
    -- monitoring_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'network_devices' AND column_name = 'monitoring_enabled') THEN
        ALTER TABLE network_devices ADD COLUMN monitoring_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- last_seen column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'network_devices' AND column_name = 'last_seen') THEN
        ALTER TABLE network_devices ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add missing columns to routers table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'location_id') THEN
        ALTER TABLE routers ADD COLUMN location_id UUID REFERENCES locations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'monitoring_enabled') THEN
        ALTER TABLE routers ADD COLUMN monitoring_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'last_seen') THEN
        ALTER TABLE routers ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =====================================================
-- 4. FINANCE AUDIT TRAIL FIXES
-- =====================================================

-- Ensure finance_audit_trail has both action and action_type columns
DO $$
BEGIN
    -- Add action column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'finance_audit_trail' AND column_name = 'action') THEN
        ALTER TABLE finance_audit_trail ADD COLUMN action VARCHAR(100);
    END IF;
    
    -- Add action_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'finance_audit_trail' AND column_name = 'action_type') THEN
        ALTER TABLE finance_audit_trail ADD COLUMN action_type VARCHAR(50);
    END IF;
    
    -- Sync data between columns
    UPDATE finance_audit_trail SET action = action_type WHERE action IS NULL AND action_type IS NOT NULL;
    UPDATE finance_audit_trail SET action_type = action WHERE action_type IS NULL AND action IS NOT NULL;
    UPDATE finance_audit_trail SET action = 'UNKNOWN', action_type = 'UNKNOWN' WHERE action IS NULL AND action_type IS NULL;
END $$;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_radius_nas_nasname ON radius_nas(nasname);
CREATE INDEX IF NOT EXISTS idx_radius_nas_status ON radius_nas(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_session_id ON radius_sessions_active(session_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_customer_id ON radius_sessions_active(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_session_id ON radius_accounting(session_id);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_username ON radius_accounting(username);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_customer_id ON radius_accounting(customer_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_tax_type ON tax_records(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_records_is_active ON tax_records(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- 6. INSERT DEFAULT TAX RECORDS
-- =====================================================

INSERT INTO tax_records (tax_type, tax_name, tax_rate, description, is_active, applies_to)
SELECT 'VAT', 'Value Added Tax', 0.16, 'Standard VAT rate for Kenya', true, 'all'
WHERE NOT EXISTS (SELECT 1 FROM tax_records WHERE tax_type = 'VAT');

INSERT INTO tax_records (tax_type, tax_name, tax_rate, description, is_active, applies_to)
SELECT 'WHT', 'Withholding Tax', 0.05, 'Withholding tax for services', true, 'services'
WHERE NOT EXISTS (SELECT 1 FROM tax_records WHERE tax_type = 'WHT');

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on new tables to application role if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'isp_app') THEN
        GRANT ALL PRIVILEGES ON radius_nas TO isp_app;
        GRANT ALL PRIVILEGES ON radius_sessions_active TO isp_app;
        GRANT ALL PRIVILEGES ON radius_accounting TO isp_app;
        GRANT ALL PRIVILEGES ON tax_records TO isp_app;
        GRANT ALL PRIVILEGES ON audit_logs TO isp_app;
    END IF;
END $$;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('radius_nas', 'radius_sessions_active', 'radius_accounting', 'tax_records', 'audit_logs');
    
    RAISE NOTICE 'Created/verified % out of 5 required tables', table_count;
END $$;
