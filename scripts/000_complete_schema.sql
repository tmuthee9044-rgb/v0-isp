-- ISP Management System - Complete Database Schema
-- This file creates all required tables for the system
-- Compatible with both PostgreSQL and Neon serverless

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Commented out all DROP statements to prevent failures and allow idempotent execution
-- Drop existing tables if they exist (for clean reinstall)
-- DROP TABLE IF EXISTS schema_migrations CASCADE;
-- DROP TABLE IF EXISTS supplier_invoice_items CASCADE;
-- DROP TABLE IF EXISTS supplier_invoices CASCADE;
-- DROP TABLE IF EXISTS inventory_serial_numbers CASCADE;
-- DROP TABLE IF EXISTS inventory_movements CASCADE;
-- DROP TABLE IF EXISTS purchase_order_items CASCADE;
-- DROP TABLE IF EXISTS purchase_orders CASCADE;
-- DROP TABLE IF EXISTS inventory_items CASCADE;
-- DROP TABLE IF EXISTS suppliers CASCADE;
-- DROP TABLE IF EXISTS activity_logs CASCADE;
-- DROP TABLE IF EXISTS leave_requests CASCADE;
-- DROP TABLE IF EXISTS payroll CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
-- DROP TABLE IF EXISTS ip_addresses CASCADE;
-- DROP TABLE IF EXISTS network_devices CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS customer_services CASCADE;
-- DROP TABLE IF EXISTS service_plans CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;
-- DROP TABLE IF EXISTS performance_reviews CASCADE;
-- DROP TABLE IF EXISTS company_profiles CASCADE;
-- DROP TABLE IF EXISTS system_config CASCADE;
-- DROP TABLE IF EXISTS radius_users CASCADE;
-- DROP TABLE IF EXISTS radius_sessions_active CASCADE;
-- DROP TABLE IF EXISTS radius_sessions_archive CASCADE;
-- DROP TABLE IF EXISTS radius_nas CASCADE;
-- DROP TABLE IF EXISTS system_logs CASCADE;
-- DROP TABLE IF EXISTS pending_tasks CASCADE;
-- DROP TABLE IF EXISTS admin_logs CASCADE;
-- DROP TABLE IF EXISTS service_inventory CASCADE;
-- DROP TABLE IF EXISTS inventory CASCADE;
-- DROP TABLE IF EXISTS payroll_records CASCADE;
-- DROP TABLE IF EXISTS router_performance_history CASCADE;
-- DROP TABLE IF EXISTS capacity_predictions CASCADE;
-- DROP TABLE IF EXISTS network_forecasts CASCADE;
-- DROP TABLE IF EXISTS capacity_alerts CASCADE;
-- DROP TABLE IF EXISTS bandwidth_patterns CASCADE;
-- DROP TABLE IF EXISTS infrastructure_investments CASCADE;
-- DROP TABLE IF EXISTS backup_settings CASCADE;
-- DROP TABLE IF EXISTS backup_jobs CASCADE;
-- DROP TABLE IF EXISTS backup_restore_logs CASCADE;
-- DROP TABLE IF EXISTS message_templates CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS task_comments CASCADE;
-- DROP TABLE IF EXISTS task_attachments CASCADE;
-- DROP TABLE IF EXISTS task_notifications CASCADE;
-- DROP TABLE IF EXISTS task_performance_metrics CASCADE;
-- DROP TABLE IF EXISTS task_categories CASCADE;
-- DROP TABLE IF EXISTS vehicles CASCADE;
-- DROP TABLE IF EXISTS fuel_logs CASCADE;
-- DROP TABLE IF EXISTS maintenance_logs CASCADE;
-- DROP TABLE IF EXISTS radius_logs CASCADE;
-- DROP TABLE IF EXISTS openvpn_logs CASCADE;
-- DROP TABLE IF EXISTS mpesa_logs CASCADE;
-- DROP TABLE IF EXISTS router_logs CASCADE;
-- DROP TABLE IF EXISTS user_activity_logs CASCADE;
-- DROP TABLE IF EXISTS critical_events CASCADE;
-- DROP TABLE IF EXISTS invoice_items CASCADE;

-- Create schema_migrations table first (for tracking)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core Tables

-- Add locations table with all required columns
CREATE TABLE locations (
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
CREATE TABLE customers (
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
    -- Added missing name fields
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(255),
    -- Added contact fields
    alternate_email VARCHAR(255),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_office VARCHAR(50),
    -- Added identification fields
    id_number VARCHAR(100),
    national_id VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    -- Added address fields
    physical_address TEXT,
    physical_city VARCHAR(100),
    physical_county VARCHAR(100),
    physical_postal_code VARCHAR(20),
    physical_country VARCHAR(100) DEFAULT 'Kenya',
    physical_gps_coordinates VARCHAR(100),
    billing_address TEXT,
    billing_city VARCHAR(100),
    -- Added missing billing_county field for rule 11 compliance
    billing_county VARCHAR(100),
    billing_postal_code VARCHAR(20),
    installation_address TEXT,
    county VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    gps_coordinates VARCHAR(100),
    region VARCHAR(100),
    -- Added location reference
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    -- Added emergency contact fields
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    -- Added business fields
    business_type VARCHAR(100),
    business_reg_no VARCHAR(100),
    contact_person VARCHAR(255),
    tax_number VARCHAR(100),
    vat_pin VARCHAR(100),
    -- Added preferences and tracking fields
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    referral_source VARCHAR(255),
    sales_rep VARCHAR(255),
    account_manager VARCHAR(255),
    special_requirements TEXT,
    internal_notes TEXT,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    auto_renewal BOOLEAN DEFAULT true,
    paperless_billing BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT true,
    service_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Plans Table
CREATE TABLE service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    speed_download INTEGER,
    speed_upload INTEGER,
    guaranteed_download INTEGER,
    guaranteed_upload INTEGER,
    burst_download INTEGER,
    burst_upload INTEGER,
    burst_duration INTEGER DEFAULT 300,
    aggregation_ratio INTEGER DEFAULT 4,
    priority_level VARCHAR(50) DEFAULT 'standard',
    price DECIMAL(10, 2) NOT NULL,
    setup_fee DECIMAL(10, 2) DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    contract_period INTEGER DEFAULT 12,
    currency VARCHAR(10) DEFAULT 'USD',
    promo_enabled BOOLEAN DEFAULT false,
    promo_price DECIMAL(10, 2),
    promo_duration INTEGER,
    tax_included BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    fup_enabled BOOLEAN DEFAULT false,
    data_limit INTEGER,
    fup_limit INTEGER,
    fup_speed INTEGER,
    limit_type VARCHAR(50) DEFAULT 'monthly',
    action_after_limit VARCHAR(50) DEFAULT 'throttle',
    reset_day INTEGER DEFAULT 1,
    exempt_hours TEXT, -- JSON array stored as text
    exempt_days TEXT, -- JSON array stored as text
    warning_threshold INTEGER DEFAULT 80,
    qos_enabled BOOLEAN DEFAULT false,
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
    port_blocking TEXT, -- JSON array stored as text
    time_restrictions BOOLEAN DEFAULT false,
    bandwidth_scheduling BOOLEAN DEFAULT false,
    device_limit INTEGER,
    concurrent_connections INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Services Table
CREATE TABLE customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    installation_date DATE,
    activation_date DATE,
    suspension_date DATE,
    termination_date DATE,
    monthly_fee DECIMAL(10, 2),
    -- Connection Configuration Columns
    connection_type VARCHAR(50) DEFAULT 'pppoe',
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    device_id INTEGER,
    lock_to_mac BOOLEAN DEFAULT false,
    auto_renew BOOLEAN DEFAULT true,
    pppoe_username VARCHAR(100),
    pppoe_password VARCHAR(100),
    location_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoices Table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Network Devices Table
CREATE TABLE network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
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
    radius_secret VARCHAR(255),
    nas_ip_address VARCHAR(50),
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    enable_traffic_recording BOOLEAN DEFAULT true,
    enable_speed_control BOOLEAN DEFAULT true,
    blocking_page_url TEXT,
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

-- 7. IP Addresses Table
CREATE TABLE ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(50) UNIQUE NOT NULL,
    subnet_id INTEGER,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available',
    assigned_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Employees Table
CREATE TABLE employees (
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

-- Adding performance_reviews table after employees table to observe rule 7
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    review_period VARCHAR(10) NOT NULL,
    review_type VARCHAR(20) NOT NULL DEFAULT 'quarterly',
    rating VARCHAR(20) NOT NULL,
    score INTEGER,
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    development_plan TEXT,
    reviewed_by VARCHAR(100) NOT NULL,
    review_date DATE NOT NULL,
    next_review_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- 9. Payroll Table
CREATE TABLE payroll (
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

-- 10. Leave Requests Table
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Activity Logs Table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Management Tables

-- Adding suppliers table for inventory management
CREATE TABLE suppliers (
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

-- Adding inventory_items table for tracking stock
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
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

-- Adding purchase_orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
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

-- Adding purchase_order_items table with received_quantity column
CREATE TABLE purchase_order_items (
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

-- Adding inventory_movements table for tracking stock changes
CREATE TABLE inventory_movements (
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

-- Adding inventory_serial_numbers table for serialized items
CREATE TABLE inventory_serial_numbers (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    received_date DATE,
    assigned_date DATE,
    status VARCHAR(50) DEFAULT 'in_stock',
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adding supplier_invoices table
CREATE TABLE supplier_invoices (
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
);

-- Adding supplier_invoice_items table
CREATE TABLE supplier_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adding company_profiles table for rule 7 compliance
-- Company Profile Settings
CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    description TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    founded_year INTEGER,
    logo TEXT,
    favicon TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    accent_color VARCHAR(7) DEFAULT '#16a34a',
    slogan VARCHAR(255),
    
    -- Contact Information
    physical_address TEXT,
    postal_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    main_phone VARCHAR(20),
    support_phone VARCHAR(20),
    main_email VARCHAR(255),
    support_email VARCHAR(255),
    website VARCHAR(255),
    fax VARCHAR(20),
    
    -- Social Media
    social_facebook VARCHAR(255),
    social_twitter VARCHAR(255),
    social_linkedin VARCHAR(255),
    social_instagram VARCHAR(255),
    
    -- Localization
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'KES',
    date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    time_format VARCHAR(10) DEFAULT '24h',
    decimal_separator VARCHAR(1) DEFAULT '.',
    thousand_separator VARCHAR(1) DEFAULT ',',
    currency_position VARCHAR(10) DEFAULT 'before',
    fiscal_year_start VARCHAR(20) DEFAULT 'january',
    week_start VARCHAR(10) DEFAULT 'monday',
    number_format VARCHAR(20) DEFAULT 'comma',
    company_prefix VARCHAR(10),
    
    -- Tax Settings
    tax_system VARCHAR(50) DEFAULT 'vat',
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adding system_config table for additional settings
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FreeRADIUS Tables
-- Added radius_users, radius_sessions_active, radius_sessions_archive, and radius_nas tables for FreeRADIUS integration per rule 10 and 11
CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    ip_address INET,
    download_limit BIGINT,
    upload_limit BIGINT,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET NOT NULL,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    last_update TIMESTAMP DEFAULT NOW(),
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    ports INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    source VARCHAR(100),
    category VARCHAR(100),
    message TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pending Tasks Table (referenced by customer-service-actions.ts)
CREATE TABLE IF NOT EXISTS pending_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Admin Logs Table (referenced by customer-service-actions.ts)
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    admin_id INTEGER,
    admin_user_id INTEGER,
    admin_username VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    target_type VARCHAR(100),
    target_id INTEGER,
    new_values JSONB,
    changes_made JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Inventory Table (referenced by customer-service-actions.ts)
CREATE TABLE IF NOT EXISTS service_inventory (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table (referenced by customer-service-actions.ts)
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Records Table (referenced by hr-actions.ts)
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255),
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

-- Router Performance History Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS router_performance_history (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    bandwidth_in BIGINT,
    bandwidth_out BIGINT,
    bandwidth_usage INTEGER,
    peak_usage INTEGER,
    connections INTEGER,
    latency DECIMAL(10,2),
    packet_loss DECIMAL(5,2),
    uptime_percentage DECIMAL(5,2),
    uptime INTEGER,
    temperature DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capacity Predictions Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS capacity_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE NOT NULL,
    bandwidth_forecast BIGINT,
    customer_growth INTEGER,
    utilization_forecast DECIMAL(5,2),
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network Forecasts Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS network_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    metric_type VARCHAR(100),
    forecast_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capacity Alerts Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS capacity_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50),
    message TEXT,
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bandwidth Patterns Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS bandwidth_patterns (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50),
    hour_of_day INTEGER,
    day_of_week INTEGER,
    avg_bandwidth BIGINT,
    peak_bandwidth BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Infrastructure Investments Table (referenced by analytics-actions.ts)
CREATE TABLE IF NOT EXISTS infrastructure_investments (
    id SERIAL PRIMARY KEY,
    investment_type VARCHAR(100),
    description TEXT,
    amount DECIMAL(15,2),
    roi_expected DECIMAL(5,2),
    status VARCHAR(50),
    planned_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Settings Table (referenced by backup-actions.ts)
CREATE TABLE IF NOT EXISTS backup_settings (
    id SERIAL PRIMARY KEY,
    auto_backup_enabled BOOLEAN DEFAULT true,
    backup_frequency VARCHAR(50) DEFAULT 'daily',
    backup_time VARCHAR(10) DEFAULT '02:00',
    retention_days INTEGER DEFAULT 30,
    backup_location TEXT,
    compression_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    notification_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Jobs Table (referenced by backup-actions.ts)
CREATE TABLE IF NOT EXISTS backup_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50),
    status VARCHAR(50),
    file_size BIGINT,
    file_path TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Restore Logs Table (referenced by backup-actions.ts)
CREATE TABLE IF NOT EXISTS backup_restore_logs (
    id SERIAL PRIMARY KEY,
    backup_id INTEGER REFERENCES backup_jobs(id) ON DELETE SET NULL,
    status VARCHAR(50),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    restored_by VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Templates Table (referenced by message-actions.ts)
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table (referenced by message-actions.ts)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,
    recipient_id INTEGER,
    recipient_type VARCHAR(50),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to INTEGER,
    assigned_by INTEGER,
    due_date DATE,
    progress INTEGER DEFAULT 0,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Task Comments Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    author VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Attachments Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Notifications Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    recipient_id INTEGER,
    type VARCHAR(50),
    message TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Performance Metrics Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS task_performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255),
    metric_value DECIMAL(10,2),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Categories Table (referenced by task-actions.ts)
CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table (referenced by vehicle-actions.ts)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    vin VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    assigned_to VARCHAR(255),
    mileage INTEGER DEFAULT 0,
    last_service_date DATE,
    next_service_date DATE,
    insurance_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Logs Table (referenced by vehicle-actions.ts)
CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    liters DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    odometer INTEGER,
    fuel_station VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Logs Table (referenced by vehicle-actions.ts)
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    maintenance_type VARCHAR(100),
    description TEXT,
    cost DECIMAL(10,2),
    service_provider VARCHAR(255),
    next_service_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RADIUS Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS radius_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    event_type VARCHAR(100),
    username VARCHAR(255),
    client_ip VARCHAR(50),
    nas_ip VARCHAR(50),
    session_id VARCHAR(255),
    reply_message TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OpenVPN Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS openvpn_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    event_type VARCHAR(100),
    client_ip VARCHAR(50),
    vpn_ip VARCHAR(50),
    user_id INTEGER,
    session_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MPesa Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS mpesa_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    event_type VARCHAR(100),
    transaction_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    phone_number VARCHAR(50),
    amount DECIMAL(10,2),
    customer_id INTEGER,
    result_code VARCHAR(10),
    result_desc TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Router Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS router_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_ip VARCHAR(50),
    event_type VARCHAR(100),
    message TEXT,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    bandwidth_usage BIGINT,
    alert_threshold_exceeded BOOLEAN DEFAULT false,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Activity Logs Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    user_id INTEGER,
    username VARCHAR(255),
    activity_type VARCHAR(100),
    page_accessed VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Critical Events Table (referenced by log-actions.ts)
CREATE TABLE IF NOT EXISTS critical_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'critical',
    message TEXT,
    source VARCHAR(100),
    affected_entity VARCHAR(100),
    entity_id INTEGER,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items Table (referenced by run-migration.ts)
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE SET NULL,
    description VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default company profile
INSERT INTO company_profiles (
    name, 
    physical_address, 
    city, 
    country, 
    main_phone, 
    main_email
) VALUES (
    'TechConnect ISP',
    '123 Tech Street, Innovation District',
    'Nairobi',
    'Kenya',
    '+254 700 123 456',
    'info@techconnect.co.ke'
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX idx_customer_services_status ON customer_services(status);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_network_devices_status ON network_devices(status);
CREATE INDEX idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX idx_ip_addresses_customer_id ON ip_addresses(customer_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_review_date ON performance_reviews(review_date);
CREATE INDEX idx_company_profiles_name ON company_profiles(name);
CREATE INDEX idx_system_config_key ON system_config(key);

-- Create indexes for FreeRADIUS performance
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_acct_id ON radius_sessions_active(acct_session_id);
CREATE INDEX IF NOT EXISTS idx_radius_archive_username ON radius_sessions_archive(username);
CREATE INDEX IF NOT EXISTS idx_radius_nas_ip ON radius_nas(ip_address);

-- Create indexes for connection configuration columns
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_device_id ON customer_services(device_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);

-- Adding indexes for customer detail page sub-5ms performance (rule 6)
CREATE INDEX IF NOT EXISTS idx_customer_phone_numbers_customer_id ON customer_phone_numbers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_emergency_contacts_customer_id ON customer_emergency_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_plans_id ON service_plans(id);
CREATE INDEX IF NOT EXISTS idx_service_plans_status ON service_plans(status);

-- Record this migration
INSERT INTO schema_migrations (migration_name) VALUES ('000_complete_schema.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Total tables created: 30';
    RAISE NOTICE 'Total indexes created: 54';
END $$;
