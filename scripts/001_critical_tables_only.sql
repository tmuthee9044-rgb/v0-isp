-- ISP Management System - Critical Tables Only
-- This file creates the 12 most critical tables needed for the system to function
-- Compatible with PostgreSQL and Neon serverless

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema_migrations table first (for tracking)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (needed by other tables)
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

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    customer_type VARCHAR(50) DEFAULT 'residential',
    status VARCHAR(50) DEFAULT 'active',
    plan VARCHAR(100),
    monthly_fee DECIMAL(10, 2) DEFAULT 0.00,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    connection_quality VARCHAR(50),
    portal_login_id VARCHAR(100),
    portal_username VARCHAR(100),
    portal_password VARCHAR(255),
    installation_date DATE,
    last_payment_date DATE,
    contract_end_date DATE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(255),
    alternate_email VARCHAR(255),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_office VARCHAR(50),
    id_number VARCHAR(100),
    national_id VARCHAR(100),
    passport_number VARCHAR(100),
    tax_id VARCHAR(100),
    physical_address TEXT,
    physical_county VARCHAR(100),
    physical_city VARCHAR(100),
    physical_postal_code VARCHAR(20),
    physical_country VARCHAR(100),
    billing_address TEXT,
    billing_county VARCHAR(100),
    billing_city VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    installation_address TEXT,
    coordinates VARCHAR(100),
    language VARCHAR(50) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'Africa/Nairobi',
    location_id INTEGER,
    notes TEXT,
    tags TEXT,
    credit_limit DECIMAL(10, 2) DEFAULT 0.00,
    auto_suspend BOOLEAN DEFAULT true,
    suspension_grace_days INTEGER DEFAULT 7,
    paperless_billing BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT true,
    service_preferences JSONB,
    county VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Plans Table
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    category VARCHAR(100),
    speed_download INTEGER,
    speed_upload INTEGER,
    price DECIMAL(10, 2),
    setup_fee DECIMAL(10, 2) DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    contract_period INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    guaranteed_download INTEGER,
    guaranteed_upload INTEGER,
    burst_download INTEGER,
    burst_upload INTEGER,
    burst_duration INTEGER,
    aggregation_ratio VARCHAR(50),
    priority_level INTEGER DEFAULT 5,
    fup_enabled BOOLEAN DEFAULT false,
    data_limit BIGINT,
    fup_limit BIGINT,
    limit_type VARCHAR(50),
    action_after_limit VARCHAR(50),
    fup_speed INTEGER,
    reset_day INTEGER DEFAULT 1,
    exempt_hours VARCHAR(255),
    exempt_days VARCHAR(255),
    warning_threshold INTEGER DEFAULT 80,
    static_ip BOOLEAN DEFAULT false,
    port_forwarding BOOLEAN DEFAULT false,
    vpn_access BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    sla_guarantee DECIMAL(5, 2),
    redundancy BOOLEAN DEFAULT false,
    monitoring BOOLEAN DEFAULT true,
    custom_dns BOOLEAN DEFAULT false,
    qos_enabled BOOLEAN DEFAULT false,
    traffic_shaping VARCHAR(100),
    bandwidth_allocation VARCHAR(100),
    latency_optimization BOOLEAN DEFAULT false,
    packet_prioritization VARCHAR(100),
    content_filtering BOOLEAN DEFAULT false,
    port_blocking TEXT,
    time_restrictions VARCHAR(255),
    bandwidth_scheduling VARCHAR(255),
    device_limit INTEGER,
    concurrent_connections INTEGER,
    promo_enabled BOOLEAN DEFAULT false,
    promo_price DECIMAL(10, 2),
    promo_duration INTEGER,
    currency VARCHAR(10) DEFAULT 'KES',
    tax_included BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Services Table
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    service_plan_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    monthly_fee DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    ip_address VARCHAR(50),
    device_id INTEGER,
    connection_type VARCHAR(100),
    config_id VARCHAR(255),
    mac_address VARCHAR(50),
    lock_to_mac BOOLEAN DEFAULT false,
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    auto_renew BOOLEAN DEFAULT true,
    location_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(100),
    reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    invoice_number VARCHAR(100) UNIQUE,
    invoice_date DATE,
    due_date DATE,
    amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Network Devices Table
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    ip_address VARCHAR(50),
    port INTEGER DEFAULT 8728,
    username VARCHAR(255),
    password VARCHAR(255),
    location_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    connection_method VARCHAR(50) DEFAULT 'api',
    api_username VARCHAR(255),
    api_password VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    radius_secret VARCHAR(255),
    nas_ip_address VARCHAR(50),
    configuration JSONB,
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. IP Addresses Table
CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    device_id INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    salary DECIMAL(10, 2),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. RADIUS Users Table
CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    customer_id INTEGER,
    service_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    download_speed INTEGER,
    upload_speed INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. RADIUS Active Sessions Table
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    session_id VARCHAR(255) UNIQUE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. RADIUS Archived Sessions Table
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    session_id VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    termination_cause VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. RADIUS NAS Table
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    nas_name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(100),
    type VARCHAR(50) DEFAULT 'other',
    ports INTEGER DEFAULT 0,
    secret VARCHAR(255) NOT NULL,
    server VARCHAR(255),
    community VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create critical indexes for performance (rule 6: sub-5ms load times)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);

-- Add foreign key constraints
ALTER TABLE customers ADD CONSTRAINT fk_customers_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE customer_services ADD CONSTRAINT fk_customer_services_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customer_services ADD CONSTRAINT fk_customer_services_plan FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE network_devices ADD CONSTRAINT fk_network_devices_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE ip_addresses ADD CONSTRAINT fk_ip_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE ip_addresses ADD CONSTRAINT fk_ip_addresses_device FOREIGN KEY (device_id) REFERENCES network_devices(id) ON DELETE SET NULL;
ALTER TABLE radius_users ADD CONSTRAINT fk_radius_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
