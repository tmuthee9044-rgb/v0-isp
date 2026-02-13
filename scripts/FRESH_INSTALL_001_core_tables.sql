-- =====================================================================
-- ISP Management System - FRESH INSTALL Part 1: Core Tables
-- Creates: locations, customers, service_plans, customer_services,
--          payments, invoices, invoice_items, network_devices, ip_addresses, ip_subnets
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System config
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 1. LOCATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(255),
    region VARCHAR(255),
    description TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. CUSTOMERS (with ALL columns from every migration)
-- =====================================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    customer_number VARCHAR(50),
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_office VARCHAR(50),
    secondary_phone VARCHAR(20),
    alternate_email VARCHAR(255),
    billing_email VARCHAR(255),
    address TEXT,
    street_1 VARCHAR(255),
    street_2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    state VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    zip_code VARCHAR(255),
    physical_address TEXT,
    physical_city VARCHAR(100),
    physical_county VARCHAR(100),
    physical_postal_code VARCHAR(20),
    physical_country VARCHAR(100) DEFAULT 'Kenya',
    physical_gps_coordinates VARCHAR(100),
    billing_address TEXT,
    billing_street_1 TEXT,
    billing_city VARCHAR(100),
    billing_county VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_zip_code VARCHAR(255),
    installation_address TEXT,
    gps_coordinates VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    id_number VARCHAR(100),
    national_id VARCHAR(100),
    passport_number VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    customer_type VARCHAR(50) DEFAULT 'individual',
    customer_category VARCHAR(50),
    category VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    business_name VARCHAR(255),
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    business_reg_no VARCHAR(100),
    contact_person VARCHAR(255),
    tax_number VARCHAR(100),
    tax_id VARCHAR(100),
    vat_pin VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    school_type VARCHAR(100),
    student_count INTEGER,
    staff_count INTEGER,
    plan VARCHAR(255),
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    account_balance DECIMAL(10,2) DEFAULT 0,
    billing_type VARCHAR(100),
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    billing_day INTEGER DEFAULT 1,
    auto_billing BOOLEAN DEFAULT true,
    auto_renewal BOOLEAN DEFAULT true,
    paperless_billing BOOLEAN DEFAULT false,
    connection_type VARCHAR(50),
    connection_quality VARCHAR(100),
    equipment_needed TEXT,
    installation_notes TEXT,
    technical_contact VARCHAR(255),
    technical_contact_phone VARCHAR(20),
    emergency_contact VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    emergency_phone VARCHAR(20),
    preferred_contact_method VARCHAR(50) DEFAULT 'phone',
    preferred_language VARCHAR(10) DEFAULT 'en',
    referral_source VARCHAR(255),
    sales_rep VARCHAR(255),
    account_manager VARCHAR(255),
    assigned_staff_id INTEGER,
    added_by_id VARCHAR(100),
    portal_login_id VARCHAR(255),
    portal_username VARCHAR(255),
    portal_password VARCHAR(255),
    password_hash VARCHAR(255),
    portal_access BOOLEAN DEFAULT false,
    login VARCHAR(255),
    sms_notifications BOOLEAN DEFAULT true,
    special_requirements TEXT,
    internal_notes TEXT,
    notes TEXT,
    service_preferences JSONB,
    kyc_verified BOOLEAN DEFAULT false,
    kyc_documents JSONB,
    gdpr_agreed VARCHAR(100),
    installation_date DATE,
    contract_end_date DATE,
    last_payment_date DATE,
    last_online DATE,
    date_add DATE,
    last_update DATE,
    prepaid_expiration_date DATE,
    prepaid_remains_days VARCHAR(255),
    prepaid_monthly_costs VARCHAR(255),
    mrr_total VARCHAR(255),
    postal_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. SERVICE PLANS (with ALL columns)
-- =====================================================================
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    speed_download INTEGER,
    speed_upload INTEGER,
    upload_speed INTEGER,
    guaranteed_download INTEGER,
    guaranteed_upload INTEGER,
    burst_download INTEGER,
    burst_upload INTEGER,
    burst_duration INTEGER DEFAULT 300,
    aggregation_ratio INTEGER DEFAULT 4,
    priority_level VARCHAR(50) DEFAULT 'standard',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    setup_fee DECIMAL(10, 2) DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    billing_cycle_days INTEGER DEFAULT 30,
    contract_period INTEGER DEFAULT 12,
    currency VARCHAR(10) DEFAULT 'USD',
    promo_enabled BOOLEAN DEFAULT false,
    promo_price DECIMAL(10, 2),
    promo_duration INTEGER,
    tax_included BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    is_tax_inclusive BOOLEAN DEFAULT false,
    fup_enabled BOOLEAN DEFAULT false,
    data_limit INTEGER,
    fup_limit INTEGER,
    fup_speed INTEGER,
    limit_type VARCHAR(50) DEFAULT 'monthly',
    action_after_limit VARCHAR(50) DEFAULT 'throttle',
    reset_day INTEGER DEFAULT 1,
    exempt_hours TEXT,
    exempt_days TEXT,
    warning_threshold INTEGER DEFAULT 80,
    qos_enabled BOOLEAN DEFAULT false,
    qos_settings JSONB,
    traffic_shaping BOOLEAN DEFAULT false,
    bandwidth_allocation JSONB,
    latency_optimization BOOLEAN DEFAULT false,
    packet_prioritization BOOLEAN DEFAULT false,
    static_ip BOOLEAN DEFAULT false,
    port_forwarding BOOLEAN DEFAULT false,
    vpn_access BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    sla_guarantee BOOLEAN DEFAULT false,
    redundancy BOOLEAN DEFAULT false,
    monitoring BOOLEAN DEFAULT false,
    custom_dns BOOLEAN DEFAULT false,
    content_filtering BOOLEAN DEFAULT false,
    port_blocking TEXT,
    time_restrictions BOOLEAN DEFAULT false,
    bandwidth_scheduling BOOLEAN DEFAULT false,
    device_limit INTEGER,
    concurrent_connections INTEGER,
    connection_type VARCHAR(50),
    fair_usage_policy TEXT,
    features JSONB,
    limitations JSONB,
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    monthly_fee NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 4. CUSTOMER SERVICES (with ALL columns)
-- =====================================================================
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    installation_date DATE,
    activation_date DATE,
    suspension_date DATE,
    termination_date DATE,
    monthly_fee DECIMAL(10, 2),
    connection_type VARCHAR(50) DEFAULT 'pppoe',
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    device_id VARCHAR(100),
    lock_to_mac BOOLEAN DEFAULT false,
    auto_renew BOOLEAN DEFAULT true,
    pppoe_username VARCHAR(100),
    pppoe_password VARCHAR(100),
    pppoe_enabled BOOLEAN DEFAULT false,
    location_id BIGINT,
    router_id BIGINT,
    auth_method VARCHAR(50) DEFAULT 'pppoe',
    enforcement_mode VARCHAR(50) DEFAULT 'radius',
    config_id INTEGER,
    activated_at TIMESTAMP,
    suspended_at TIMESTAMP,
    suspension_reason VARCHAR(255),
    suspended_by VARCHAR(100),
    router_sync_status VARCHAR(50),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    service_start TIMESTAMP,
    service_end TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    last_billed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 5. PAYMENTS (with ALL columns)
-- =====================================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(100) UNIQUE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER,
    service_id INTEGER,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    method VARCHAR(20) DEFAULT 'cash',
    payment_reference VARCHAR(255),
    reference TEXT,
    mpesa_receipt_number VARCHAR(255),
    transaction_id VARCHAR(255),
    reference_number VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 6. INVOICES (with ALL columns)
-- =====================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_date DATE,
    due_date DATE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(10,2) DEFAULT 0,
    balance NUMERIC(15,2),
    tax NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2),
    invoice_type VARCHAR(50) DEFAULT 'service',
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    terms TEXT,
    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 7. INVOICE ITEMS
-- =====================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER,
    description VARCHAR(500),
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount NUMERIC(15,2),
    total_price DECIMAL(10,2),
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 8. NETWORK DEVICES (with ALL columns)
-- =====================================================================
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    type VARCHAR(100),
    device_type VARCHAR(100),
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    location VARCHAR(255),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    port INTEGER DEFAULT 8728,
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    username VARCHAR(100),
    password VARCHAR(255),
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    connection_method VARCHAR(50) DEFAULT 'api',
    customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius',
    radius_secret VARCHAR(255),
    nas_ip_address VARCHAR(50),
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url TEXT,
    mikrotik_host VARCHAR(255),
    mikrotik_port INTEGER DEFAULT 8728,
    mikrotik_username VARCHAR(100),
    mikrotik_password VARCHAR(255),
    mikrotik_use_ssl BOOLEAN DEFAULT false,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    hostname VARCHAR(255),
    firmware_version VARCHAR(50),
    configuration JSONB,
    notes TEXT,
    last_seen TIMESTAMP,
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 9. IP ADDRESSES
-- =====================================================================
CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(50) UNIQUE NOT NULL,
    subnet_id INTEGER,
    subnet VARCHAR(50),
    gateway VARCHAR(50),
    dns_primary VARCHAR(50),
    dns_secondary VARCHAR(50),
    vlan_id INTEGER,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    service_id INTEGER,
    ip_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',
    assigned_date DATE,
    assigned_at TIMESTAMP,
    released_at TIMESTAMP,
    notes TEXT,
    location_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 10. IP SUBNETS
-- =====================================================================
CREATE TABLE IF NOT EXISTS ip_subnets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    cidr VARCHAR(50),
    network_address VARCHAR(50),
    subnet_mask VARCHAR(50),
    gateway VARCHAR(50),
    dns_primary VARCHAR(50),
    dns_secondary VARCHAR(50),
    vlan_id INTEGER,
    total_ips INTEGER,
    used_ips INTEGER DEFAULT 0,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    allocation_mode VARCHAR(20) DEFAULT 'auto',
    version VARCHAR(10) DEFAULT 'IPv4',
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 11. ACCOUNT BALANCES
-- =====================================================================
CREATE TABLE IF NOT EXISTS account_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_balances_old (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record migration
INSERT INTO schema_migrations (filename) VALUES ('FRESH_INSTALL_001_core_tables.sql') ON CONFLICT (filename) DO NOTHING;
