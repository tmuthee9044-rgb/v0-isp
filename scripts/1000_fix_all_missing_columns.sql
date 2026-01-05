-- Comprehensive fix for all 28 tables with incorrect column counts
-- This script adds ALL missing columns based on the complete schema

-- Enable pgcrypto extension for password hashing (gen_salt function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix customer_services table
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS activation_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspension_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe';
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS device_id INTEGER;

-- Fix network_devices table
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 8728;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_port INTEGER DEFAULT 8728;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS connection_method VARCHAR(50) DEFAULT 'api';
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS nas_ip_address VARCHAR(50);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_username VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_password VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS enable_traffic_recording BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS enable_speed_control BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS blocking_page_url TEXT;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS configuration JSONB;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Fix company_profiles table (localization columns)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'My ISP Company';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'comma';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'monday';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS decimal_separator VARCHAR(1) DEFAULT '.';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS thousand_separator VARCHAR(1) DEFAULT ',';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'before';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS fiscal_year_start VARCHAR(20) DEFAULT 'january';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_prefix VARCHAR(10);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_system VARCHAR(50) DEFAULT 'vat';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 16.00;

-- Fix radius_users table
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS download_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS upload_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS session_timeout INTEGER;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS idle_timeout INTEGER;

-- Fix radius_sessions_active table
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_in BIGINT DEFAULT 0;
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_out BIGINT DEFAULT 0;

-- Fix radius_sessions_archive table  
ALTER TABLE radius_sessions_archive ADD COLUMN IF NOT EXISTS packets_in BIGINT;
ALTER TABLE radius_sessions_archive ADD COLUMN IF NOT EXISTS packets_out BIGINT;

-- Fix radius_nas table
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS short_name VARCHAR(32);
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'mikrotik';

-- Fix routers table
ALTER TABLE routers ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 8728;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS api_port INTEGER DEFAULT 8728;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS connection_method VARCHAR(50) DEFAULT 'api';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS enable_traffic_recording BOOLEAN DEFAULT true;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS enable_speed_control BOOLEAN DEFAULT true;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS blocking_page_url TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS configuration JSONB;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Fix payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Fix customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_office VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_reg_no VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_category VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_billing BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'email';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_documents JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_pin VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255); -- Adding billing_email column for separate billing contact
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_manager VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_preferences JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_1 VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_2 VARCHAR(255);

-- Fix locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);

-- Fix tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Fix service_plans table
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS upload_speed INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS limitations JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS speed_download INTEGER;
-- Adding missing speed_upload column for service plans
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS speed_upload INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS guaranteed_download INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS guaranteed_upload INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_download INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_upload INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_duration INTEGER DEFAULT 300;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS aggregation_ratio INTEGER DEFAULT 4;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'standard';

-- Fix ip_addresses table  
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS subnet VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS dns_primary VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS dns_secondary VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS vlan_id INTEGER;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Fix invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'service';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Fix payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS configuration JSONB;

-- Fix loyalty_transactions table
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS points_spent INTEGER DEFAULT 0;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS reference_id INTEGER;

-- Fix loyalty_redemptions table
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS points_required INTEGER NOT NULL;
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50);
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS reward_value DECIMAL(10,2);
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Fix financial_reports table
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(50);
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS report_data JSONB;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS generated_by INTEGER;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Fix chart_of_accounts table
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE CASCADE;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(50);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix financial_periods table
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS period_number INTEGER;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

-- Fix supplier_invoices table
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Fix customer_equipment table
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

-- Fix backup_settings table
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_type VARCHAR(50);
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_frequency VARCHAR(50);
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_time TIME;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 30;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS storage_location TEXT;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Fix refunds table
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id INTEGER;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(255);

-- Fix expense_approvals table
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS expense_id INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approver_id INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approval_level INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(10,2);
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Fix capacity_predictions table
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS prediction_date DATE;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS predicted_bandwidth BIGINT;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS predicted_users INTEGER;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2);

-- Fix bandwidth_patterns table
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS hour_of_day INTEGER;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS average_bandwidth BIGINT;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS peak_bandwidth BIGINT;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS user_count INTEGER;

-- Create router_sync_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS router_sync_status (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_message TEXT,
    customers_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create account_balances_old table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_balances_old (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bandwidth_usage table for customer statistics from physical routers (rule 9)
-- Create bandwidth_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS bandwidth_usage (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    ip_address INET,
    date_hour TIMESTAMP NOT NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_bandwidth_entry UNIQUE(customer_id, device_id, ip_address, date_hour)
);

-- Create indexes for bandwidth_usage table (rule 6 - fast page loads)
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_id ON bandwidth_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_device_id ON bandwidth_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_date_hour ON bandwidth_usage(date_hour);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_ip_address ON bandwidth_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_date ON bandwidth_usage(customer_id, date_hour DESC);

-- Create performance indexes for all new columns
CREATE INDEX IF NOT EXISTS idx_customer_services_mac ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_user ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_nas_network_device ON radius_nas(network_device_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(customer_category);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_location ON ip_addresses(location_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_device ON capacity_predictions(network_device_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_patterns_device ON bandwidth_patterns(network_device_id);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_router ON router_sync_status(router_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_old_customer ON account_balances_old(customer_id);

-- Fix locations table id column to use auto-increment sequence
-- Create sequence for locations id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'locations_id_seq') THEN
        CREATE SEQUENCE locations_id_seq;
        -- Set the sequence to start from max existing id + 1
        PERFORM setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 0) + 1, false);
        -- Set the default value for id column to use the sequence
        ALTER TABLE locations ALTER COLUMN id SET DEFAULT nextval('locations_id_seq');
    END IF;
END $$;

-- Add sequence for network_devices id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'network_devices_id_seq') THEN
        CREATE SEQUENCE network_devices_id_seq;
        -- Set the sequence to start from max existing id + 1
        PERFORM setval('network_devices_id_seq', COALESCE((SELECT MAX(id) FROM network_devices), 0) + 1, false);
        -- Set the default value for id column to use the sequence
        ALTER TABLE network_devices ALTER COLUMN id SET DEFAULT nextval('network_devices_id_seq');
    END IF;
END $$;

-- Add sequence for suppliers id ONLY if it's an integer type
DO $$
DECLARE
    id_type text;
BEGIN
    SELECT data_type INTO id_type 
    FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'id';
    
    IF id_type IN ('integer', 'bigint') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'suppliers_id_seq') THEN
            CREATE SEQUENCE suppliers_id_seq;
            PERFORM setval('suppliers_id_seq', COALESCE((SELECT MAX(id) FROM suppliers), 0) + 1, false);
            ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT nextval('suppliers_id_seq');
        END IF;
    END IF;
END $$;

-- Add sequence for warehouses id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'warehouses_id_seq') THEN
        CREATE SEQUENCE warehouses_id_seq;
        PERFORM setval('warehouses_id_seq', COALESCE((SELECT MAX(id) FROM warehouses), 0) + 1, false);
        ALTER TABLE warehouses ALTER COLUMN id SET DEFAULT nextval('warehouses_id_seq');
    END IF;
END $$;

-- Fix system_config table - add updated_at column if missing
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix system_logs table - ensure id column has auto-increment sequence
DO $$
BEGIN
    -- Create sequence for system_logs if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'system_logs_id_seq') THEN
        CREATE SEQUENCE system_logs_id_seq;
        
        -- Set sequence to start from max existing id + 1
        PERFORM setval('system_logs_id_seq', COALESCE((SELECT MAX(id) FROM system_logs WHERE id IS NOT NULL), 0) + 1, false);
        
        -- Set default value for id column
        ALTER TABLE system_logs ALTER COLUMN id SET DEFAULT nextval('system_logs_id_seq');
    END IF;
END $$;

-- Ensure system_logs id column is properly set as PRIMARY KEY
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_logs_pkey') THEN
        ALTER TABLE system_logs ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Generate customer_number for existing customers without one
UPDATE customers SET customer_number = 'CUST' || LPAD(id::TEXT, 6, '0') WHERE customer_number IS NULL;

-- Create servers table for infrastructure monitoring
-- Create servers table if it doesn't exist (for infrastructure overview API)
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) DEFAULT 'physical',
    ip_address VARCHAR(50),
    hostname VARCHAR(255),
    location VARCHAR(255),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'offline',
    operating_system VARCHAR(100),
    cpu_cores INTEGER,
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    memory_total BIGINT,
    memory_usage DECIMAL(5,2) DEFAULT 0,
    disk_total BIGINT,
    disk_usage DECIMAL(5,2) DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 0,
    last_boot TIMESTAMP,
    last_seen TIMESTAMP,
    monitoring_enabled BOOLEAN DEFAULT true,
    alert_threshold_cpu DECIMAL(5,2) DEFAULT 80,
    alert_threshold_memory DECIMAL(5,2) DEFAULT 85,
    alert_threshold_disk DECIMAL(5,2) DEFAULT 90,
    notes TEXT,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for servers table (rule 6 - fast page loads under 5ms)
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_type ON servers(type);
CREATE INDEX IF NOT EXISTS idx_servers_location_id ON servers(location_id);
CREATE INDEX IF NOT EXISTS idx_servers_monitoring ON servers(monitoring_enabled);
CREATE INDEX IF NOT EXISTS idx_servers_last_seen ON servers(last_seen DESC);

-- Adding complete employees table with all HR/payroll compliance columns
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    national_id VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    reporting_manager VARCHAR(255),
    employment_type VARCHAR(50),
    contract_type VARCHAR(50),
    hire_date DATE,
    probation_period INTEGER,
    work_location VARCHAR(255),
    salary DECIMAL(10, 2),
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    benefits TEXT,
    payroll_frequency VARCHAR(50) DEFAULT 'monthly',
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    kra_pin VARCHAR(50),
    nssf_number VARCHAR(50),
    sha_number VARCHAR(50),
    portal_username VARCHAR(100),
    portal_password VARCHAR(255),
    qualifications TEXT,
    experience TEXT,
    skills TEXT,
    notes TEXT,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing employees table if it exists
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nssf_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sha_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_frequency VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS skills TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create payroll table if it doesn't exist
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    deductions DECIMAL(10, 2) DEFAULT 0.00,
    gross_pay DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    nhif DECIMAL(10, 2) DEFAULT 0.00,
    nssf DECIMAL(10, 2) DEFAULT 0.00,
    net_pay DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing payroll table if it exists
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS pay_period_start DATE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS pay_period_end DATE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(10, 2);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS allowances DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS deductions DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(10, 2);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS tax DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS nhif DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS nssf DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS net_pay DECIMAL(10, 2);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS period VARCHAR(50);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_nssf ON employees(nssf_number);
CREATE INDEX IF NOT EXISTS idx_employees_kra ON employees(kra_pin);
CREATE INDEX IF NOT EXISTS idx_employees_sha ON employees(sha_number);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period_start, pay_period_end);

-- Adding interface_traffic_history table for per-port traffic monitoring
-- Create table for per-interface traffic history from routers
CREATE TABLE IF NOT EXISTS interface_traffic_history (
  id SERIAL PRIMARY KEY,
  router_id INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
  interface_name VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rx_bytes BIGINT DEFAULT 0,
  tx_bytes BIGINT DEFAULT 0,
  rx_packets BIGINT DEFAULT 0,
  tx_packets BIGINT DEFAULT 0,
  rx_errors INTEGER DEFAULT 0,
  tx_errors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance (Rule 6 - fast loading under 5ms)
CREATE INDEX IF NOT EXISTS idx_interface_traffic_router ON interface_traffic_history(router_id);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_timestamp ON interface_traffic_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_interface ON interface_traffic_history(interface_name);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_router_time ON interface_traffic_history(router_id, timestamp DESC);

-- Add comment
COMMENT ON TABLE interface_traffic_history IS 'Historical traffic statistics per router interface/port for bandwidth monitoring';

-- Adding auto-increment sequence for ip_subnets table
-- Fix ip_subnets table ID sequence for auto-increment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'ip_subnets_id_seq') THEN
        CREATE SEQUENCE IF NOT EXISTS ip_subnets_id_seq START WITH 1 INCREMENT BY 1;
        EXECUTE 'SELECT setval(''ip_subnets_id_seq'', GREATEST(COALESCE((SELECT MAX(id) FROM ip_subnets), 0), 0) + 1, false)';
        ALTER TABLE ip_subnets ALTER COLUMN id SET DEFAULT nextval('ip_subnets_id_seq');
    END IF;
END $$;

-- Adding auto-increment sequence for inventory_items table
-- Fix inventory_items table ID sequence for auto-increment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'inventory_items_id_seq') THEN
        CREATE SEQUENCE IF NOT EXISTS inventory_items_id_seq START WITH 1 INCREMENT BY 1;
        EXECUTE 'SELECT setval(''inventory_items_id_seq'', GREATEST(COALESCE((SELECT MAX(id) FROM inventory_items), 0), 0) + 1, false)';
        ALTER TABLE inventory_items ALTER COLUMN id SET DEFAULT nextval('inventory_items_id_seq');
    END IF;
END $$;

-- Adding auto-increment sequence for vehicles table
-- Fix vehicles table ID sequence for auto-increment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'vehicles_id_seq') THEN
        CREATE SEQUENCE IF NOT EXISTS vehicles_id_seq START WITH 1 INCREMENT BY 1;
        EXECUTE 'SELECT setval(''vehicles_id_seq'', GREATEST(COALESCE((SELECT MAX(id) FROM vehicles), 0), 0) + 1, false)';
        ALTER TABLE vehicles ALTER COLUMN id SET DEFAULT nextval('vehicles_id_seq');
    END IF;
END $$;

-- Adding period column to performance_reviews table for payroll compatibility
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS period VARCHAR(50);

-- Ensure activity_logs.details is JSONB type for JSON operators
ALTER TABLE activity_logs ALTER COLUMN details TYPE JSONB USING details::jsonb;

-- Add missing columns to payroll_records for HR compliance
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS period VARCHAR(50);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS paye DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS sha DECIMAL(10,2) DEFAULT 0;

-- Adding auto-increment sequence for customers table
-- Fix customers table ID sequence for auto-increment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customers_id_seq') THEN
        CREATE SEQUENCE IF NOT EXISTS customers_id_seq START WITH 1 INCREMENT BY 1;
        EXECUTE 'SELECT setval(''customers_id_seq'', GREATEST(COALESCE((SELECT MAX(id) FROM customers), 0), 0) + 1, false)';
        ALTER TABLE customers ALTER COLUMN id SET DEFAULT nextval('customers_id_seq');
    END IF;
END $$;
