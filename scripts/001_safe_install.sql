-- ISP Management System - Safe Installation Script
-- This script is designed to be idempotent and handle existing schemas
-- Run this INSTEAD of 000_complete_schema.sql if that fails

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema_migrations table for tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CORE TABLES (minimal dependencies)
-- =============================================

-- Locations table
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

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mpesa_phone_number VARCHAR(15),
    physical_address TEXT,
    physical_city VARCHAR(100),
    physical_county VARCHAR(100),
    postal_code VARCHAR(20),
    login VARCHAR(100),
    password TEXT,
    customer_type VARCHAR(50) DEFAULT 'individual',
    status VARCHAR(50) DEFAULT 'active',
    balance DECIMAL(10, 2) DEFAULT 0.00,
    monthly_fee DECIMAL(10, 2) DEFAULT 0.00,
    plan VARCHAR(100),
    connection_type VARCHAR(50) DEFAULT 'pppoe',
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    notes TEXT,
    import_source VARCHAR(100),
    import_date TIMESTAMP,
    report_first_service_amount DECIMAL(10, 2) DEFAULT 0,
    conversion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Plans table
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    download_speed INTEGER,
    upload_speed INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    national_id VARCHAR(100),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    kra_pin VARCHAR(50),
    nssf_number VARCHAR(50),
    sha_number VARCHAR(50),
    performance_rating VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table (UUID primary key)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
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

-- Network Devices table
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    ip_address VARCHAR(50),
    hostname VARCHAR(255),
    mac_address VARCHAR(50),
    location VARCHAR(255),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    username VARCHAR(100),
    password TEXT,
    api_username VARCHAR(100),
    api_password TEXT,
    connection_method VARCHAR(50) DEFAULT 'api',
    radius_secret VARCHAR(255),
    nas_ip_address VARCHAR(50),
    customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    enable_traffic_recording BOOLEAN DEFAULT false,
    enable_speed_control BOOLEAN DEFAULT false,
    blocking_page_url TEXT,
    configuration JSONB,
    compliance_status VARCHAR(20) DEFAULT 'unknown',
    last_compliance_check TIMESTAMP,
    compliance_notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DEPENDENT TABLES
-- =============================================

-- Customer Services
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    monthly_fee DECIMAL(10, 2),
    connection_type VARCHAR(50) DEFAULT 'pppoe',
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    pppoe_username VARCHAR(100),
    pppoe_password VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
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

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
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

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IP Addresses
CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    subnet_mask VARCHAR(45),
    gateway VARCHAR(45),
    pool_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'available',
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Records
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

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
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

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
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

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
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

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    subtotal DECIMAL(15, 2) DEFAULT 0.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(15, 2),
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Invoices
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
);

-- Customer Documents
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
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_confidential BOOLEAN DEFAULT FALSE,
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Equipment
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
);

-- System Config
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provisioning Queue
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
);

-- =============================================
-- LOG TABLES
-- =============================================

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

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_network_devices_type ON network_devices(type);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_status ON provisioning_queue(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_router ON provisioning_queue(router_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);

-- Mark migration as complete
INSERT INTO schema_migrations (migration_name) 
VALUES ('001_safe_install')
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'ISP Management System schema installed successfully!';
END $$;
