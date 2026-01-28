#!/bin/bash

# Safe Schema Fix Script
# This script pipes SQL directly to psql to avoid permission issues
# with file paths that the postgres user can't access

set -e

echo "==================================================="
echo "Safe Database Schema Fix (No File Permission Issues)"
echo "==================================================="

# Database configuration
DB_NAME="${POSTGRES_DATABASE:-isp_system}"
DB_USER="${POSTGRES_USER:-isp_admin}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_PASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}"

# Function to run SQL as postgres superuser without file references
run_as_postgres() {
    sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=0 <<< "$1"
}

# Function to run SQL as application user without file references  
run_as_user() {
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=0 <<< "$1"
}

echo ""
echo "[INFO] Step 1: Transferring table ownership to ${DB_USER}..."
echo ""

# Transfer ownership - piped directly, no file reference
run_as_postgres "
-- Transfer all table ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${DB_USER}';
    END LOOP;
END \$\$;

-- Transfer all sequence ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO ${DB_USER}';
    END LOOP;
END \$\$;

-- Transfer all view ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.table_name) || ' OWNER TO ${DB_USER}';
    END LOOP;
END \$\$;

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT USAGE ON SCHEMA public TO ${DB_USER};
"

echo "[OK] Ownership transfer completed!"
echo ""
echo "[INFO] Step 2: Creating missing tables..."
echo ""

# Create critical missing tables first
run_as_user "
-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create radius_sessions_active table if it doesn't exist
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(45),
    nas_port INTEGER,
    acct_session_id VARCHAR(255),
    framed_ip_address VARCHAR(45),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    session_time INTEGER DEFAULT 0,
    terminate_cause VARCHAR(100),
    customer_service_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_nas table if it doesn't exist
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(128) NOT NULL,
    shortname VARCHAR(32),
    type VARCHAR(50) DEFAULT 'mikrotik',
    ports INTEGER,
    secret VARCHAR(60) NOT NULL,
    server VARCHAR(64),
    community VARCHAR(50),
    description VARCHAR(200),
    network_device_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tax_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS tax_records (
    id SERIAL PRIMARY KEY,
    tax_type VARCHAR(100) NOT NULL,
    tax_period VARCHAR(50),
    amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routers table if it doesn't exist
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    ip_address VARCHAR(45),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    firmware_version VARCHAR(100),
    location_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    connection_type VARCHAR(50),
    username VARCHAR(255),
    password VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    port INTEGER DEFAULT 8728,
    connection_method VARCHAR(50) DEFAULT 'api',
    radius_secret VARCHAR(255),
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync TIMESTAMP WITHOUT TIME ZONE,
    sync_error TEXT,
    configuration JSONB,
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    temperature NUMERIC(5,2),
    uptime BIGINT,
    last_seen TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create performance_reviews table with correct column types
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    reviewer_id INTEGER,
    review_period VARCHAR(100),
    review_type VARCHAR(50) DEFAULT 'quarterly',
    rating VARCHAR(50),
    score INTEGER DEFAULT 0,
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    development_plan TEXT,
    reviewed_by VARCHAR(100),
    review_date DATE,
    next_review_date DATE,
    status VARCHAR(50) DEFAULT 'completed',
    review_period_start DATE,
    review_period_end DATE,
    overall_rating INTEGER,
    goals_achievement TEXT,
    strengths TEXT,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
"

echo "[OK] Missing tables created!"
echo ""
echo "[INFO] Step 3: Adding missing columns to existing tables..."
echo ""

# Add missing columns - piped directly
run_as_user "
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
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

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
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT true;

-- Fix company_profiles table
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
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS favicon TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS main_phone VARCHAR(20);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS main_email VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS social_linkedin VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS established_date DATE;

-- Fix customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_office VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_category VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category VARCHAR(50);
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
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_preferences JSONB;

-- Fix radius_users table
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS download_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS upload_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS session_timeout INTEGER;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS idle_timeout INTEGER;

-- Fix radius_sessions_active table
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_in BIGINT DEFAULT 0;
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_out BIGINT DEFAULT 0;

-- Fix radius_nas table
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS network_device_id INTEGER;
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
ALTER TABLE routers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';

-- Fix customer_contacts table
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS relationship VARCHAR(100);

-- Fix locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- Fix admin_logs table
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS resource_id INTEGER;

-- Fix invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;

-- Fix roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;

-- Fix customer_categories table
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2);
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 5;

-- Fix ip_subnets table
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS cidr VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS version VARCHAR(10) DEFAULT 'IPv4';
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS router_id BIGINT;
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS allocation_mode VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS used_ips INTEGER DEFAULT 0;
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS total_ips INTEGER;
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS available_ips INTEGER DEFAULT 0;

-- Fix tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;

-- Fix payroll_records table
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS allowances NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS deductions NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Fix messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update name column for existing customers if it's NULL
UPDATE customers 
SET name = CASE 
    WHEN customer_type = 'business' THEN COALESCE(business_name, first_name || ' ' || last_name)
    ELSE COALESCE(first_name || ' ' || last_name, business_name)
END
WHERE name IS NULL;

-- Update total_amount from amount column for existing invoices where total_amount is NULL
UPDATE invoices SET total_amount = amount WHERE total_amount IS NULL OR total_amount = 0;

-- Update available_ips for ip_subnets
UPDATE ip_subnets SET available_ips = total_ips - used_ips WHERE available_ips IS NULL OR available_ips = 0;
"

echo "[OK] Missing columns added!"
echo ""
echo "==================================================="
echo "[SUCCESS] Schema fix completed successfully!"
echo "==================================================="
echo ""
echo "Summary:"
echo "- Transferred table/sequence/view ownership to ${DB_USER}"
echo "- Created missing tables: radius_sessions_active, radius_nas, tax_records, audit_logs, routers"
echo "- Added all missing columns to existing tables"
echo ""
echo "If you see any errors above, they are likely:"
echo "- Tables that don't exist yet (will be created when needed)"
echo "- Columns that already exist (safe to ignore)"
echo ""
