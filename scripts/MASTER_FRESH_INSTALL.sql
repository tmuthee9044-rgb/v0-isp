-- ================================================================
-- ISP MANAGEMENT SYSTEM - MASTER FRESH INSTALL SCRIPT
-- ================================================================
-- Single consolidated script for new installations
-- Creates ALL tables, columns, indexes, sequences, triggers, and seed data
-- 100% idempotent - safe to run multiple times
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create neon_auth schema
CREATE SCHEMA IF NOT EXISTS neon_auth;

-- ================================================================
-- SECTION 1: CORE SYSTEM TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE,
    migration_name VARCHAR(255) UNIQUE,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neon_auth.users_sync (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    raw_json JSONB
);

CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20),
    source VARCHAR(255),
    category VARCHAR(100),
    message TEXT NOT NULL,
    details JSONB,
    stack_trace TEXT,
    user_id INTEGER,
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(255),
    customer_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    resource_type VARCHAR(100),
    entity_id INTEGER,
    resource_id INTEGER,
    details JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    user_id INTEGER,
    action VARCHAR(255),
    resource_type VARCHAR(100),
    entity_type VARCHAR(100),
    resource_id INTEGER,
    entity_id INTEGER,
    details TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 2: LOCATIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 3: CUSTOMERS
-- ================================================================

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100),
    customer_number VARCHAR(50),
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    alternate_email VARCHAR(255),
    billing_email VARCHAR(255),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_office VARCHAR(50),
    secondary_phone VARCHAR(20),
    address TEXT,
    street_1 VARCHAR(255),
    street_2 VARCHAR(255),
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
    postal_address TEXT,
    county VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    zip_code VARCHAR(255),
    gps_coordinates VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    customer_type VARCHAR(50) DEFAULT 'residential',
    customer_category VARCHAR(50),
    category VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    plan VARCHAR(255),
    monthly_fee DECIMAL(10, 2) DEFAULT 0.00,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    account_balance DECIMAL(10,2) DEFAULT 0,
    connection_quality VARCHAR(100),
    connection_type VARCHAR(50),
    id_number VARCHAR(100),
    national_id VARCHAR(100),
    passport_number VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    business_name VARCHAR(255),
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    billing_type VARCHAR(100),
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
    emergency_contact VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    emergency_phone VARCHAR(20),
    technical_contact VARCHAR(255),
    technical_contact_phone VARCHAR(20),
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    referral_source VARCHAR(255),
    sales_rep VARCHAR(255),
    account_manager VARCHAR(255),
    added_by_id VARCHAR(100),
    assigned_staff_id INTEGER,
    special_requirements TEXT,
    internal_notes TEXT,
    notes TEXT,
    installation_notes TEXT,
    equipment_needed TEXT,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    billing_day INTEGER DEFAULT 1,
    auto_billing BOOLEAN DEFAULT true,
    auto_renewal BOOLEAN DEFAULT true,
    paperless_billing BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT true,
    payment_method VARCHAR(50),
    service_preferences JSONB,
    kyc_verified BOOLEAN DEFAULT false,
    kyc_documents JSONB,
    preferred_language VARCHAR(10) DEFAULT 'en',
    portal_login_id VARCHAR(255),
    portal_username VARCHAR(255),
    portal_password VARCHAR(255),
    password_hash VARCHAR(255),
    portal_access BOOLEAN DEFAULT false,
    login VARCHAR(255),
    mrr_total VARCHAR(255),
    prepaid_remains_days VARCHAR(255),
    prepaid_monthly_costs VARCHAR(255),
    prepaid_expiration_date DATE,
    gdpr_agreed VARCHAR(100),
    installation_date DATE,
    last_payment_date DATE,
    last_online DATE,
    contract_end_date DATE,
    date_add DATE,
    last_update DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    address_type VARCHAR(50),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    gps_coordinates VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percentage NUMERIC,
    priority_level INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    relationship VARCHAR(100),
    contact_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_phone_numbers (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    phone_type VARCHAR(50) DEFAULT 'mobile',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_emergency_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50),
    relationship VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    balance NUMERIC(15,2) DEFAULT 0,
    credit_limit NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    last_payment_date DATE,
    last_invoice_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- SECTION 4: SERVICE PLANS
-- ================================================================

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
    price DECIMAL(10, 2),
    monthly_fee NUMERIC(15,2),
    setup_fee DECIMAL(10, 2) DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    billing_cycle_days INTEGER DEFAULT 30,
    contract_period INTEGER DEFAULT 12,
    currency VARCHAR(10) DEFAULT 'KES',
    promo_enabled BOOLEAN DEFAULT false,
    promo_price DECIMAL(10, 2),
    promo_duration INTEGER,
    tax_included BOOLEAN DEFAULT false,
    is_tax_inclusive BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
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
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    plan_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 5: CUSTOMER SERVICES
-- ================================================================

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
    router_id INTEGER,
    auth_method VARCHAR(50) DEFAULT 'pppoe',
    enforcement_mode VARCHAR(50) DEFAULT 'radius',
    config_id INTEGER,
    service_start TIMESTAMP,
    service_end TIMESTAMP,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    last_billed_at TIMESTAMP,
    suspended_at TIMESTAMP,
    activated_at TIMESTAMP,
    router_sync_status VARCHAR(50),
    suspension_reason VARCHAR(255),
    suspended_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 6: NETWORK
-- ================================================================

CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
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
    connection_method VARCHAR(50) DEFAULT 'api',
    customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius',
    radius_secret VARCHAR(255),
    nas_ip_address VARCHAR(50),
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    mikrotik_host VARCHAR(255),
    mikrotik_port INTEGER DEFAULT 8728,
    mikrotik_username VARCHAR(100),
    mikrotik_password VARCHAR(255),
    mikrotik_use_ssl BOOLEAN DEFAULT false,
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url TEXT,
    monitoring_enabled BOOLEAN DEFAULT true,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    hostname VARCHAR(255),
    firmware_version VARCHAR(50),
    configuration JSONB,
    notes TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    type VARCHAR(100),
    port INTEGER DEFAULT 8728,
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    username VARCHAR(100),
    password VARCHAR(255),
    connection_method VARCHAR(50) DEFAULT 'api',
    radius_secret VARCHAR(255),
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url TEXT,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    hostname VARCHAR(255),
    firmware_version VARCHAR(50),
    configuration JSONB,
    location_id INTEGER,
    monitoring_enabled BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    temperature NUMERIC,
    uptime BIGINT,
    sync_status VARCHAR(50),
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(50) NOT NULL,
    subnet_id INTEGER,
    subnet VARCHAR(50),
    gateway VARCHAR(50),
    dns_primary VARCHAR(50),
    dns_secondary VARCHAR(50),
    vlan_id INTEGER,
    ip_type VARCHAR(50),
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    service_id INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    assigned_date DATE,
    assigned_at TIMESTAMP,
    released_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_subnets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    network VARCHAR(50) NOT NULL,
    cidr VARCHAR(50),
    subnet_mask VARCHAR(50),
    gateway VARCHAR(50),
    vlan_id INTEGER,
    total_ips INTEGER,
    used_ips INTEGER DEFAULT 0,
    allocation_mode VARCHAR(20) DEFAULT 'auto',
    version VARCHAR(10) DEFAULT 'IPv4',
    router_id INTEGER,
    location_id INTEGER,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS server_configurations (
    id SERIAL PRIMARY KEY,
    server_id INTEGER,
    config_key VARCHAR(255),
    config_value TEXT,
    port INTEGER,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bandwidth_configs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER,
    download_limit INTEGER,
    upload_limit INTEGER,
    burst_limit INTEGER,
    priority INTEGER DEFAULT 5,
    qos_policy VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS router_sync_status (
    id SERIAL PRIMARY KEY,
    router_id INTEGER,
    service_id INTEGER,
    sync_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    sync_message TEXT,
    retry_count INTEGER,
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 7: RADIUS / AAA
-- ================================================================

CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    password_hash VARCHAR(255),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    ip_address VARCHAR(50),
    mac_address VARCHAR(17),
    download_limit BIGINT,
    upload_limit BIGINT,
    simultaneous_use INTEGER DEFAULT 1,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    expiration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(255) NOT NULL,
    shortname VARCHAR(32),
    short_name VARCHAR(32),
    type VARCHAR(50) DEFAULT 'mikrotik',
    ports INTEGER,
    secret VARCHAR(255) NOT NULL,
    server VARCHAR(255),
    community VARCHAR(255),
    description VARCHAR(255),
    network_device_id INTEGER,
    location_id INTEGER,
    monitoring_enabled BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active',
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64),
    username VARCHAR(64) NOT NULL,
    nas_ip_address VARCHAR(50),
    nas_port_id VARCHAR(50),
    framed_ip_address VARCHAR(50),
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    acct_session_time INTEGER DEFAULT 0,
    acct_input_octets BIGINT DEFAULT 0,
    acct_output_octets BIGINT DEFAULT 0,
    acct_input_gigawords INTEGER DEFAULT 0,
    acct_output_gigawords INTEGER DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    acct_start_time TIMESTAMP,
    acct_update_time TIMESTAMP,
    acct_terminate_cause VARCHAR(32),
    customer_id INTEGER,
    service_id INTEGER,
    nas_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64),
    username VARCHAR(64),
    nas_ip_address VARCHAR(50),
    framed_ip_address VARCHAR(50),
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    acct_session_time INTEGER,
    acct_input_octets BIGINT,
    acct_output_octets BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    acct_start_time TIMESTAMP,
    acct_stop_time TIMESTAMP,
    acct_terminate_cause VARCHAR(32),
    customer_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radius_accounting (
    id SERIAL PRIMARY KEY,
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
    acct_start_time TIMESTAMP,
    acct_stop_time TIMESTAMP,
    acct_terminate_cause VARCHAR(32),
    customer_id INTEGER,
    service_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- FreeRADIUS compatibility tables
CREATE TABLE IF NOT EXISTS radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radgroupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS radacct (
    radacctid BIGSERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL,
    acctuniqueid VARCHAR(32),
    username VARCHAR(64) NOT NULL,
    groupname VARCHAR(64),
    realm VARCHAR(64),
    nasipaddress VARCHAR(50),
    nasportid VARCHAR(15),
    nasporttype VARCHAR(32),
    acctstarttime TIMESTAMP,
    acctupdatetime TIMESTAMP,
    acctstoptime TIMESTAMP,
    acctinterval BIGINT,
    acctsessiontime BIGINT,
    acctauthentic VARCHAR(32),
    connectinfo_start VARCHAR(50),
    connectinfo_stop VARCHAR(50),
    acctinputoctets BIGINT,
    acctoutputoctets BIGINT,
    calledstationid VARCHAR(50),
    callingstationid VARCHAR(50),
    acctterminatecause VARCHAR(32),
    servicetype VARCHAR(32),
    framedprotocol VARCHAR(32),
    framedipaddress VARCHAR(50),
    acctstartdelay BIGINT,
    acctstopdelay BIGINT,
    xascendsessionsvrkey VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS radpostauth (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    pass VARCHAR(64),
    reply VARCHAR(32),
    authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================================
-- SECTION 8: FINANCIAL TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100),
    amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2),
    total NUMERIC(15,2),
    subtotal DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    amount_paid NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance NUMERIC(15,2),
    due_date DATE,
    invoice_date DATE,
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

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(100),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id),
    service_id INTEGER,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    method VARCHAR(20) DEFAULT 'cash',
    payment_reference VARCHAR(255),
    reference TEXT,
    reference_number VARCHAR(255),
    transaction_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50),
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_applications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    adjustment_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    amount_applied NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    adjustment_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    refund_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS billing_cycles (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    cycle_start DATE,
    cycle_end DATE,
    amount NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER,
    transaction_id VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    bank_reference VARCHAR(255),
    amount NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'pending',
    processor_response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(100),
    api_key TEXT,
    secret_key TEXT,
    webhook_url TEXT,
    is_sandbox BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mpesa_logs (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50),
    phone_number VARCHAR(20),
    amount DECIMAL(10,2),
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    checkout_request_id VARCHAR(255),
    merchant_request_id VARCHAR(255),
    result_code INTEGER,
    result_desc TEXT,
    mpesa_receipt_number VARCHAR(100),
    raw_response JSONB,
    processed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 9: EXPENSE & FINANCE MANAGEMENT
-- ================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    budget_amount DECIMAL(12,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget_allocation DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor VARCHAR(255),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank',
    status VARCHAR(50) DEFAULT 'paid',
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id INTEGER REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50),
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'posted',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    line_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_streams (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES revenue_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_flow_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    is_inflow BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_flow_transactions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES cash_flow_categories(id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    bank_account VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_returns (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES tax_periods(id),
    return_type VARCHAR(50) NOT NULL,
    total_revenue DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    taxable_income DECIMAL(15,2),
    tax_due DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'draft',
    filed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_records (
    id SERIAL PRIMARY KEY,
    tax_type VARCHAR(50),
    tax_name VARCHAR(100),
    tax_rate DECIMAL(5,4) DEFAULT 0.16,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    applies_to VARCHAR(50) DEFAULT 'all',
    period VARCHAR(50),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(100) NOT NULL,
    budget_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_line_items (
    id SERIAL PRIMARY KEY,
    version_id INTEGER,
    category_id INTEGER,
    subcategory_id INTEGER,
    line_item_name VARCHAR(255),
    budgeted_amount NUMERIC(15,2),
    quarter_1 NUMERIC(15,2),
    quarter_2 NUMERIC(15,2),
    quarter_3 NUMERIC(15,2),
    quarter_4 NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    report_type VARCHAR(50),
    report_data JSONB,
    generated_by INTEGER,
    file_path TEXT,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    action_type VARCHAR(50),
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balance_sheet_view (
    id SERIAL PRIMARY KEY,
    assets_total NUMERIC(15,2),
    liabilities_total NUMERIC(15,2),
    equity_total NUMERIC(15,2),
    revenue_total NUMERIC(15,2),
    expense_total NUMERIC(15,2)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    transaction_type VARCHAR(50),
    reference_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points_redeemed INTEGER NOT NULL,
    points_required INTEGER NOT NULL,
    reward_type VARCHAR(50),
    reward_value DECIMAL(10,2),
    expiry_date DATE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bonus_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255),
    description TEXT,
    campaign_type VARCHAR(100),
    bonus_rules JSONB,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    target_audience JSONB,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    total_bonus_awarded NUMERIC(15,2) DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- SECTION 10: HR & EMPLOYEES
-- ================================================================

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50),
    employee_number VARCHAR(50),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    national_id VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    reporting_manager VARCHAR(255),
    employment_type VARCHAR(50),
    contract_type VARCHAR(50),
    hire_date DATE,
    contract_end_date DATE,
    termination_date DATE,
    probation_period INTEGER,
    work_location VARCHAR(255),
    salary DECIMAL(10, 2),
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    benefits TEXT,
    payroll_frequency VARCHAR(50) DEFAULT 'monthly',
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    kra_pin VARCHAR(100),
    nssf_number VARCHAR(100),
    nhif_number VARCHAR(100),
    sha_number VARCHAR(100),
    id_number VARCHAR(50),
    tax_number VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id INTEGER,
    budget DECIMAL(12,2),
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_start DATE,
    pay_period_end DATE,
    period VARCHAR(50),
    basic_salary DECIMAL(10, 2),
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    deductions DECIMAL(10, 2) DEFAULT 0.00,
    gross_pay DECIMAL(10, 2),
    tax DECIMAL(10, 2) DEFAULT 0.00,
    nhif DECIMAL(10, 2) DEFAULT 0.00,
    nssf DECIMAL(10, 2) DEFAULT 0.00,
    net_pay DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100),
    employee_name VARCHAR(255),
    period VARCHAR(50),
    pay_period_start DATE,
    pay_period_end DATE,
    basic_salary DECIMAL(10, 2) DEFAULT 0.00,
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    overtime DECIMAL(10, 2) DEFAULT 0.00,
    overtime_hours NUMERIC,
    overtime_rate NUMERIC,
    gross_pay DECIMAL(10, 2) DEFAULT 0.00,
    paye DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    tax_deduction NUMERIC,
    nssf DECIMAL(10, 2) DEFAULT 0.00,
    nhif DECIMAL(10, 2) DEFAULT 0.00,
    sha DECIMAL(10, 2) DEFAULT 0.00,
    housing_levy DECIMAL(10, 2) DEFAULT 0.00,
    other_deductions DECIMAL(10, 2) DEFAULT 0.00,
    total_deductions DECIMAL(10, 2) DEFAULT 0.00,
    deductions DECIMAL(10, 2) DEFAULT 0.00,
    net_pay DECIMAL(10, 2) DEFAULT 0.00,
    payment_date DATE,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50),
    reviewer_id INTEGER,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    position VARCHAR(100),
    review_period VARCHAR(100),
    review_type VARCHAR(50) DEFAULT 'quarterly',
    period VARCHAR(50),
    rating VARCHAR(50),
    score INTEGER DEFAULT 0,
    overall_rating INTEGER,
    goals_met_percentage INTEGER DEFAULT 0,
    goals TEXT,
    achievements TEXT,
    goals_achievement TEXT,
    areas_for_improvement TEXT,
    strengths TEXT,
    development_plan TEXT,
    comments TEXT,
    reviewed_by VARCHAR(100),
    review_date DATE,
    next_review_date DATE,
    review_period_start DATE,
    review_period_end DATE,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 11: INVENTORY & SUPPLIERS
-- ================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    supplier_type VARCHAR(50) DEFAULT 'vendor',
    tax_id VARCHAR(100),
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    selling_price DECIMAL(10, 2) DEFAULT 0.00,
    requires_serial_number BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT',
    subtotal DECIMAL(15, 2) DEFAULT 0.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    reason TEXT,
    reference_type VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    performed_by VARCHAR(100),
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'available',
    assigned_to_customer INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    assigned_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    payment_terms INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);

CREATE TABLE IF NOT EXISTS supplier_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    item_name VARCHAR(255),
    unit_price NUMERIC(12, 2),
    total_price NUMERIC(12, 2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price NUMERIC(15,2),
    reorder_level INTEGER DEFAULT 0,
    supplier VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'in_stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_inventory (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    inventory_item_id INTEGER,
    quantity INTEGER DEFAULT 1,
    assigned_date DATE,
    status VARCHAR(50) DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Kenya',
    postal_code TEXT,
    contact_person TEXT,
    phone_number TEXT,
    email TEXT,
    capacity_cubic_meters DECIMAL(10,2),
    current_utilization DECIMAL(5,2) DEFAULT 0.00,
    warehouse_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    manager_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- SECTION 12: VEHICLES
-- ================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    registration_number VARCHAR(50),
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    type VARCHAR(50),
    vehicle_type VARCHAR(50),
    fuel_type VARCHAR(50),
    capacity INTEGER,
    mileage INTEGER DEFAULT 0,
    insurance_expiry DATE,
    next_service_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    assigned_to INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    date DATE NOT NULL,
    liters NUMERIC(10,2) NOT NULL,
    cost NUMERIC(15,2) NOT NULL,
    mileage INTEGER,
    fuel_station VARCHAR(255),
    driver VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(100),
    description TEXT,
    cost NUMERIC(15,2),
    service_provider VARCHAR(255),
    next_service_date DATE,
    mileage INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 13: TASKS & MESSAGING
-- ================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER,
    created_by INTEGER,
    customer_id INTEGER,
    location_id INTEGER,
    due_date DATE,
    completed_at TIMESTAMP,
    related_type VARCHAR(100),
    related_id INTEGER,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    filename VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER,
    notification_type VARCHAR(50),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_performance_metrics (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    metric_type VARCHAR(50),
    value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    description TEXT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    template_type VARCHAR(50),
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(50),
    recipient_id INTEGER,
    phone VARCHAR(50),
    email VARCHAR(255),
    subject VARCHAR(500),
    message TEXT NOT NULL,
    message_type VARCHAR(50),
    channel VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    scheduled_at TIMESTAMP,
    error_message TEXT,
    cost NUMERIC(15,2),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    template_id INTEGER,
    target_audience JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication_settings (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100),
    setting_key VARCHAR(255),
    setting_value TEXT,
    api_key TEXT,
    sender_id VARCHAR(50),
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 14: COMPANY & SETTINGS
-- ================================================================

CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) DEFAULT 'My ISP Company',
    business_name VARCHAR(255),
    name VARCHAR(255),
    trading_name VARCHAR(255),
    company_trading_name VARCHAR(255),
    registration_number VARCHAR(100),
    company_registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    company_tax_number VARCHAR(100),
    company_description TEXT,
    description TEXT,
    company_industry VARCHAR(100) DEFAULT 'telecommunications',
    industry VARCHAR(100),
    company_size VARCHAR(50) DEFAULT 'medium',
    company_founded_year INTEGER,
    company_prefix VARCHAR(10),
    phone VARCHAR(50),
    main_phone VARCHAR(20),
    contact_secondary_phone VARCHAR(20),
    email VARCHAR(255),
    main_email VARCHAR(255),
    support_email VARCHAR(255),
    contact_support_email VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    physical_address TEXT,
    contact_city VARCHAR(100),
    city VARCHAR(100),
    contact_state VARCHAR(100),
    contact_postal_code VARCHAR(20),
    contact_country VARCHAR(100) DEFAULT 'Kenya',
    country VARCHAR(100) DEFAULT 'Kenya',
    contact_facebook VARCHAR(255),
    social_facebook VARCHAR(255),
    contact_twitter VARCHAR(255),
    social_twitter VARCHAR(255),
    contact_linkedin VARCHAR(255),
    social_linkedin VARCHAR(255),
    logo TEXT,
    logo_url TEXT,
    favicon TEXT,
    branding_primary_color VARCHAR(7) DEFAULT '#3b82f6',
    branding_secondary_color VARCHAR(7) DEFAULT '#64748b',
    branding_accent_color VARCHAR(7) DEFAULT '#16a34a',
    language VARCHAR(10) DEFAULT 'en',
    default_language VARCHAR(10) DEFAULT 'en',
    localization_language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'KES',
    localization_currency VARCHAR(10) DEFAULT 'KES',
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    localization_timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    localization_date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    time_format VARCHAR(10) DEFAULT '24h',
    localization_time_format VARCHAR(10) DEFAULT '24h',
    number_format VARCHAR(20) DEFAULT '1,000.00',
    localization_number_format VARCHAR(20) DEFAULT 'comma',
    week_start VARCHAR(10) DEFAULT 'monday',
    localization_week_start VARCHAR(10) DEFAULT 'monday',
    decimal_separator VARCHAR(1) DEFAULT '.',
    thousand_separator VARCHAR(1) DEFAULT ',',
    currency_position VARCHAR(10) DEFAULT 'before',
    fiscal_year_start VARCHAR(20) DEFAULT 'january',
    tax_system VARCHAR(50) DEFAULT 'vat',
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    established_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255),
    setting_value TEXT,
    setting_type VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 15: USERS & RBAC
-- ================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    role_id INTEGER,
    employee_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL,
    hierarchy_level INTEGER DEFAULT 0,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(100),
    permission_key VARCHAR(200) NOT NULL,
    permission_name VARCHAR(200),
    display_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER,
    role_name VARCHAR(50),
    permission_id INTEGER,
    permission_key VARCHAR(100),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    status VARCHAR(20) DEFAULT 'success',
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- SECTION 16: SUPPORT
-- ================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    category VARCHAR(100),
    assigned_to INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_by INTEGER,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    feedback_type VARCHAR(50) DEFAULT 'service',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- ================================================================
-- SECTION 17: HOTSPOT
-- ================================================================

CREATE TABLE IF NOT EXISTS hotspots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    ssid VARCHAR(100) NOT NULL,
    password VARCHAR(255),
    security_type VARCHAR(50) DEFAULT 'WPA2',
    bandwidth_limit INTEGER,
    user_limit INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'active',
    device_mac VARCHAR(17),
    device_model VARCHAR(100),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotspot_users (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    time_limit INTEGER,
    data_limit INTEGER,
    expiry_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotspot_sessions (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES hotspot_users(id) ON DELETE CASCADE,
    mac_address VARCHAR(17),
    ip_address VARCHAR(50),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    data_used BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS hotspot_vouchers (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    time_limit INTEGER,
    data_limit INTEGER,
    max_users INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expiry_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 18: ANALYTICS & MONITORING
-- ================================================================

CREATE TABLE IF NOT EXISTS router_performance_history (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    active_connections INTEGER,
    throughput_in BIGINT,
    throughput_out BIGINT,
    bandwidth_in BIGINT,
    bandwidth_out BIGINT,
    uptime BIGINT,
    latency NUMERIC,
    packet_loss NUMERIC,
    temperature NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interface_traffic_history (
    id SERIAL PRIMARY KEY,
    router_id INTEGER NOT NULL,
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

CREATE TABLE IF NOT EXISTS capacity_predictions (
    id SERIAL PRIMARY KEY,
    location_id INTEGER,
    metric_type VARCHAR(50),
    prediction_date DATE,
    predicted_value NUMERIC,
    predicted_capacity BIGINT,
    confidence_level NUMERIC,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS network_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_date DATE,
    metric VARCHAR(50),
    value NUMERIC,
    growth_rate NUMERIC,
    predicted_users INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capacity_alerts (
    id SERIAL PRIMARY KEY,
    location_id INTEGER,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    current_value NUMERIC,
    threshold_value NUMERIC,
    is_acknowledged BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bandwidth_patterns (
    id SERIAL PRIMARY KEY,
    date DATE,
    pattern_date DATE,
    hour INTEGER,
    hour_of_day INTEGER,
    day_of_week INTEGER,
    location_id INTEGER,
    average_usage BIGINT,
    peak_usage BIGINT,
    user_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS infrastructure_investments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    amount DECIMAL(15,2),
    investment_date DATE,
    category VARCHAR(100),
    expected_roi NUMERIC,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 19: BACKUP
-- ================================================================

CREATE TABLE IF NOT EXISTS backup_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enable_scheduled_backups BOOLEAN DEFAULT true,
    full_backup_frequency VARCHAR(50) DEFAULT 'weekly',
    full_backup_day VARCHAR(20) DEFAULT 'sunday',
    full_backup_time TIME DEFAULT '02:00:00',
    incremental_frequency VARCHAR(50) DEFAULT 'daily',
    incremental_interval INTEGER DEFAULT 1,
    incremental_time TIME DEFAULT '02:00:00',
    maintenance_start TIME DEFAULT '01:00:00',
    maintenance_end TIME DEFAULT '05:00:00',
    enable_database_backup BOOLEAN DEFAULT true,
    database_retention_days INTEGER DEFAULT 30,
    database_compression VARCHAR(50) DEFAULT 'gzip',
    enable_file_backup BOOLEAN DEFAULT true,
    backup_paths TEXT,
    file_retention_days INTEGER DEFAULT 30,
    exclude_patterns TEXT,
    backup_customers BOOLEAN DEFAULT true,
    backup_billing BOOLEAN DEFAULT true,
    backup_network BOOLEAN DEFAULT true,
    backup_logs BOOLEAN DEFAULT false,
    backup_settings BOOLEAN DEFAULT true,
    enable_local_storage BOOLEAN DEFAULT true,
    local_storage_path VARCHAR(500) DEFAULT '/var/backups/isp',
    local_storage_quota INTEGER DEFAULT 100,
    local_cleanup_policy VARCHAR(50) DEFAULT 'auto',
    enable_remote_storage BOOLEAN DEFAULT false,
    remote_protocol VARCHAR(50),
    remote_host VARCHAR(255),
    remote_port INTEGER,
    remote_username VARCHAR(255),
    remote_password TEXT,
    remote_path VARCHAR(500),
    enable_cloud_storage BOOLEAN DEFAULT false,
    cloud_provider VARCHAR(50),
    cloud_region VARCHAR(100),
    cloud_bucket VARCHAR(255),
    cloud_access_key TEXT,
    cloud_secret_key TEXT,
    enable_encryption BOOLEAN DEFAULT true,
    encryption_key TEXT,
    enable_notifications BOOLEAN DEFAULT true,
    enable_integrity_check BOOLEAN DEFAULT true,
    enable_secure_delete BOOLEAN DEFAULT false,
    enable_access_logging BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_size VARCHAR(100),
    backup_path VARCHAR(500),
    local_path VARCHAR(500),
    remote_path VARCHAR(500),
    cloud_path VARCHAR(500),
    storage_location VARCHAR(255),
    includes_database BOOLEAN DEFAULT true,
    includes_files BOOLEAN DEFAULT true,
    includes_config BOOLEAN DEFAULT true,
    includes_logs BOOLEAN DEFAULT false,
    encryption_used BOOLEAN DEFAULT false,
    compression_ratio NUMERIC(5,2),
    checksum VARCHAR(255),
    error_message TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_restore_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID,
    restore_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    restore_location VARCHAR(500),
    restored_by VARCHAR(255),
    restored_components TEXT[],
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    backup_type VARCHAR(50),
    cron_expression VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    storage_locations TEXT[],
    backup_components JSONB,
    retention_policy JSONB,
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    total_runs INTEGER DEFAULT 0,
    average_duration_minutes NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    additional_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_file_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID,
    file_path VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    file_hash VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT false,
    compression_ratio NUMERIC(5,2),
    last_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    storage_type VARCHAR(50),
    connection_string TEXT,
    access_credentials JSONB,
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    total_capacity_gb NUMERIC(15,2),
    used_space_gb NUMERIC(15,2) DEFAULT 0,
    available_space_gb NUMERIC(15,2),
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(50),
    test_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SECTION 20: LOGS
-- ================================================================

CREATE TABLE IF NOT EXISTS radius_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(50),
    username VARCHAR(100),
    nas_ip VARCHAR(50),
    event_type VARCHAR(50),
    message TEXT,
    details JSONB,
    acct_session_time INTEGER,
    nas_port INTEGER,
    log_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS openvpn_logs (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100),
    client_ip VARCHAR(50),
    virtual_ip VARCHAR(50),
    event_type VARCHAR(50),
    message TEXT,
    log_timestamp TIMESTAMP,
    session_duration INTEGER,
    bytes_sent BIGINT,
    bytes_received BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS router_logs (
    id SERIAL PRIMARY KEY,
    router_id INTEGER,
    log_level VARCHAR(20),
    category VARCHAR(50),
    message TEXT,
    topics VARCHAR(255),
    log_timestamp TIMESTAMP,
    source_module VARCHAR(100),
    raw_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(50),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    session_id VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS critical_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'high',
    source VARCHAR(100),
    message TEXT NOT NULL,
    details JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 21: MOBILE APP / CUSTOMER PORTAL
-- ================================================================

CREATE TABLE IF NOT EXISTS customer_app_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    fcm_token VARCHAR(255),
    jwt_token_hash VARCHAR(255),
    ip_address VARCHAR(50),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_usage_cache (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER,
    date DATE NOT NULL,
    upload_mb DECIMAL(15, 2) DEFAULT 0,
    download_mb DECIMAL(15, 2) DEFAULT 0,
    total_mb DECIMAL(15, 2) DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    peak_speed_mbps DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parental_control_profiles (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER,
    profile_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    allowed_hours VARCHAR(255),
    allowed_days VARCHAR(255),
    block_adult BOOLEAN DEFAULT false,
    block_social BOOLEAN DEFAULT false,
    block_gaming BOOLEAN DEFAULT false,
    block_streaming BOOLEAN DEFAULT false,
    custom_blocked_domains TEXT,
    custom_allowed_domains TEXT,
    max_download_mbps INTEGER,
    max_upload_mbps INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_payment_methods (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    mpesa_phone VARCHAR(20),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    card_token VARCHAR(255),
    bank_name VARCHAR(100),
    account_number_encrypted VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- ================================================================
-- SECTION 22: SERVICE EVENTS & NOTIFICATIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS service_events (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    event_type VARCHAR(30) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_notifications (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    notification_type VARCHAR(30) NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 23: AUTOMATION
-- ================================================================

CREATE TABLE IF NOT EXISTS automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    trigger_type VARCHAR(100),
    trigger_conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- SECTION 24: KEY INDEXES
-- ================================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_email_lookup ON customers(email) WHERE email IS NOT NULL;

-- Customer Services
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_router_id ON customer_services(router_id);

-- Locations
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_name_active ON locations(name) WHERE status = 'active';

-- Finance
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- HR
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);

-- Network
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);

-- RADIUS FreeRADIUS compatibility
CREATE INDEX IF NOT EXISTS radcheck_username ON radcheck(username);
CREATE INDEX IF NOT EXISTS radreply_username ON radreply(username);
CREATE INDEX IF NOT EXISTS radgroupcheck_groupname ON radgroupcheck(groupname);
CREATE INDEX IF NOT EXISTS radgroupreply_groupname ON radgroupreply(groupname);
CREATE INDEX IF NOT EXISTS radusergroup_username ON radusergroup(username);

-- Support
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Hotspot
CREATE INDEX IF NOT EXISTS idx_hotspots_status ON hotspots(status);
CREATE INDEX IF NOT EXISTS idx_hotspot_users_hotspot_id ON hotspot_users(hotspot_id);

-- Supplier/Inventory
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice_id ON supplier_invoice_items(invoice_id);

-- Monitoring
CREATE INDEX IF NOT EXISTS idx_router_performance_router ON router_performance_history(router_id);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_router ON interface_traffic_history(router_id);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_timestamp ON interface_traffic_history(timestamp);

-- Tasks & Messages
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Auth
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- Credit Notes
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);

-- Payroll Records
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period);

-- ================================================================
-- SECTION 25: TRIGGERS & FUNCTIONS
-- ================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supplier invoice timestamp trigger
CREATE OR REPLACE FUNCTION update_supplier_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_supplier_invoice_timestamp') THEN
        CREATE TRIGGER trigger_update_supplier_invoice_timestamp
        BEFORE UPDATE ON supplier_invoices
        FOR EACH ROW EXECUTE FUNCTION update_supplier_invoice_timestamp();
    END IF;
END $$;

-- Support tickets timestamp trigger
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_support_tickets_updated_at') THEN
        CREATE TRIGGER trigger_update_support_tickets_updated_at
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW EXECUTE FUNCTION update_support_tickets_updated_at();
    END IF;
END $$;

-- ================================================================
-- SECTION 26: SEED DATA
-- ================================================================

-- Default expense categories
INSERT INTO expense_categories (name, description, budget_amount, color) VALUES
('Bandwidth & Connectivity', 'Internet bandwidth and connectivity costs', 160000, '#3b82f6'),
('Infrastructure & Equipment', 'Network equipment and infrastructure', 85000, '#10b981'),
('Personnel Costs', 'Staff salaries and benefits', 80000, '#8b5cf6'),
('Regulatory & Compliance', 'Licensing and regulatory fees', 32000, '#ef4444'),
('Marketing & Sales', 'Marketing campaigns and sales activities', 25000, '#f59e0b'),
('Other Operating Expenses', 'Miscellaneous operational costs', 12000, '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- Default chart of accounts
DO $$
BEGIN
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, description) VALUES
    ('1000', 'Current Assets', 'Asset', 'Short-term assets'),
    ('1100', 'Cash and Cash Equivalents', 'Asset', 'Cash accounts'),
    ('1200', 'Accounts Receivable', 'Asset', 'Customer receivables'),
    ('1300', 'Inventory', 'Asset', 'Equipment and supplies'),
    ('1500', 'Fixed Assets', 'Asset', 'Long-term assets'),
    ('2000', 'Current Liabilities', 'Liability', 'Short-term obligations'),
    ('2100', 'Accounts Payable', 'Liability', 'Supplier payables'),
    ('3000', 'Owner Equity', 'Equity', 'Owner investment'),
    ('3100', 'Retained Earnings', 'Equity', 'Accumulated profits'),
    ('4000', 'Operating Revenue', 'Revenue', 'Main business income'),
    ('4100', 'Internet Service Revenue', 'Revenue', 'Monthly service fees'),
    ('5000', 'Operating Expenses', 'Expense', 'Business operating costs'),
    ('5100', 'Bandwidth Costs', 'Expense', 'Internet connectivity'),
    ('5200', 'Staff Salaries', 'Expense', 'Employee compensation')
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

-- Default roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('Super Administrator', 'Full system access', TRUE),
    ('Administrator', 'Administrative access', TRUE),
    ('Manager', 'Management access', TRUE),
    ('Technician', 'Technical operations', TRUE),
    ('Accountant', 'Financial management', TRUE),
    ('Support Agent', 'Customer support', TRUE),
    ('Employee', 'Basic employee access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Default tax records
INSERT INTO tax_records (tax_type, tax_name, tax_rate, description, is_active, applies_to)
SELECT 'VAT', 'Value Added Tax', 0.16, 'Standard VAT rate for Kenya', true, 'all'
WHERE NOT EXISTS (SELECT 1 FROM tax_records WHERE tax_type = 'VAT');

-- ================================================================
-- SECTION 27: SEQUENCE FIXES
-- Ensures all SERIAL columns auto-increment correctly
-- ================================================================

DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = 'public'
        WHERE c.table_schema = 'public'
        AND c.column_name = 'id'
        AND c.data_type IN ('integer', 'bigint')
        AND c.column_default LIKE 'nextval%'
    LOOP
        EXECUTE format(
            'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX(id) FROM %I), 0) + 1, false)',
            t.table_name, t.column_name, t.table_name
        );
    END LOOP;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'FRESH INSTALL COMPLETE';
    RAISE NOTICE 'Total tables created: %', table_count;
    RAISE NOTICE '========================================';
END $$;
