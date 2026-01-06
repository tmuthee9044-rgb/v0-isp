-- ISP Management System - 12 Critical Core Tables
-- This script creates ONLY the 12 missing critical tables
-- Run this BEFORE 1000_fix_all_missing_columns.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. LOCATIONS TABLE (dependency for customers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(255),
    region VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE, -- Added UNIQUE constraint for ON CONFLICT
    phone VARCHAR(50),
    address TEXT,
    customer_type VARCHAR(50) DEFAULT 'residential',
    status VARCHAR(50) DEFAULT 'active',
    balance DECIMAL(10, 2) DEFAULT 0.00,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. SERVICE_PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    -- Basic Information (5 fields)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(50) DEFAULT 'residential',
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    
    -- Speed Configuration (9 fields)
    speed_download INTEGER DEFAULT 0,
    speed_upload INTEGER DEFAULT 0,
    guaranteed_download INTEGER,
    guaranteed_upload INTEGER,
    burst_download INTEGER,
    burst_upload INTEGER,
    burst_duration INTEGER DEFAULT 300,
    aggregation_ratio INTEGER DEFAULT 4,
    priority_level VARCHAR(50) DEFAULT 'standard',
    
    -- Pricing Configuration (10 fields)
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    setup_fee DECIMAL(10, 2) DEFAULT 0,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    contract_period INTEGER DEFAULT 12,
    currency VARCHAR(10) DEFAULT 'USD',
    promo_enabled BOOLEAN DEFAULT FALSE,
    promo_price DECIMAL(10, 2),
    promo_duration INTEGER,
    tax_included BOOLEAN DEFAULT FALSE,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- FUP (Fair Usage Policy) Configuration (9 fields)
    fup_enabled BOOLEAN DEFAULT FALSE,
    data_limit INTEGER,
    fup_limit INTEGER,
    fup_speed INTEGER,
    limit_type VARCHAR(50) DEFAULT 'monthly',
    action_after_limit VARCHAR(50) DEFAULT 'throttle',
    reset_day INTEGER DEFAULT 1,
    exempt_hours JSONB,
    exempt_days JSONB,
    warning_threshold INTEGER DEFAULT 80,
    
    -- QoS (Quality of Service) Configuration (6 fields)
    qos_enabled BOOLEAN DEFAULT FALSE,
    traffic_shaping BOOLEAN DEFAULT FALSE,
    bandwidth_allocation JSONB,
    latency_optimization BOOLEAN DEFAULT FALSE,
    packet_prioritization BOOLEAN DEFAULT FALSE,
    
    -- Advanced Features (8 fields)
    static_ip BOOLEAN DEFAULT FALSE,
    port_forwarding BOOLEAN DEFAULT FALSE,
    vpn_access BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    sla_guarantee BOOLEAN DEFAULT FALSE,
    redundancy BOOLEAN DEFAULT FALSE,
    monitoring BOOLEAN DEFAULT FALSE,
    custom_dns BOOLEAN DEFAULT FALSE,
    
    -- Restrictions (7 fields)
    content_filtering BOOLEAN DEFAULT FALSE,
    port_blocking JSONB,
    time_restrictions BOOLEAN DEFAULT FALSE,
    bandwidth_scheduling BOOLEAN DEFAULT FALSE,
    device_limit INTEGER,
    concurrent_connections INTEGER,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. CUSTOMER_SERVICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    monthly_fee DECIMAL(10, 2) DEFAULT 0.00,
    installation_date DATE,
    activation_date DATE,
    mac_address VARCHAR(17),
    ip_address INET,
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. NETWORK_DEVICES TABLE (routers, switches, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'router',
    ip_address INET,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    api_username VARCHAR(255),
    api_password VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. IP_ADDRESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    subnet_id INTEGER,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available',
    type VARCHAR(50) DEFAULT 'dynamic',
    assigned_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(10, 2),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. RADIUS_USERS TABLE (for authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. RADIUS_SESSIONS_ACTIVE TABLE (active connections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. RADIUS_SESSIONS_ARCHIVE TABLE (historical sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    session_id VARCHAR(255) NOT NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    termination_cause VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. RADIUS_NAS TABLE (Network Access Servers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    nas_name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(100),
    nas_ip_address INET UNIQUE NOT NULL,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'other',
    ports INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 14. PAYROLL_RECORDS TABLE (for HR compliance and payroll history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    pay_period_start DATE,
    pay_period_end DATE,
    basic_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
    allowances DECIMAL(10, 2) DEFAULT 0,
    overtime DECIMAL(10, 2) DEFAULT 0,
    gross_pay DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    paye DECIMAL(10, 2) DEFAULT 0,
    nssf DECIMAL(10, 2) DEFAULT 0,
    nhif DECIMAL(10, 2) DEFAULT 0,
    sha DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,
    net_pay DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATE ESSENTIAL INDEXES FOR PERFORMANCE (Rule 6: Sub-5ms loads)
-- ============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location_id);

-- Customer Services indexes
CREATE INDEX IF NOT EXISTS idx_customer_services_customer ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_mac ON customer_services(mac_address);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Network devices indexes
CREATE INDEX IF NOT EXISTS idx_network_devices_type ON network_devices(type);
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);

-- IP addresses indexes
CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer ON ip_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON ip_addresses(ip_address);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- RADIUS indexes
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_session ON radius_sessions_active(session_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_start ON radius_sessions_archive(start_time);
CREATE INDEX IF NOT EXISTS idx_radius_nas_ip ON radius_nas(nas_ip_address);

-- Payroll records indexes
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period);
CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period_start ON payroll_records(pay_period_start);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Log completion
INSERT INTO schema_migrations (migration_name) 
VALUES ('002_create_12_critical_tables') 
ON CONFLICT (migration_name) DO NOTHING;
