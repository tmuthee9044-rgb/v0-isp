-- ISP Management System - Complete Database Schema
-- This file creates all required tables for the system
-- Compatible with both PostgreSQL and Neon serverless

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS ip_addresses CASCADE;
DROP TABLE IF EXISTS network_devices CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS customer_services CASCADE;
DROP TABLE IF EXISTS service_plans CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

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
    billing_postal_code VARCHAR(20),
    installation_address TEXT,
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
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(10, 2),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Record this migration
INSERT INTO schema_migrations (migration_name) VALUES ('000_complete_schema.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Total tables created: 13';
    RAISE NOTICE 'Total indexes created: 18';
END $$;
