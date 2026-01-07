-- ISP Management System - Working Database Schema
-- Simplified schema that focuses on successful table creation
-- Compatible with PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tables (in dependency order)

-- 1. Locations Table
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

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    county VARCHAR(255),
    postal_code VARCHAR(20),
    id_number VARCHAR(50),
    customer_type VARCHAR(50) DEFAULT 'individual',
    status VARCHAR(50) DEFAULT 'active',
    portal_password VARCHAR(255),
    installation_address TEXT,
    service_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Service Plans Table
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    price DECIMAL(10, 2),
    speed_download INTEGER,
    speed_upload INTEGER,
    data_limit INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer Services Table
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    status VARCHAR(50) DEFAULT 'active',
    monthly_fee DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(50),
    reference VARCHAR(255),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Network Devices (Routers) Table
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    ip_address VARCHAR(50),
    port INTEGER DEFAULT 8728,
    username VARCHAR(255),
    password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. IP Addresses Table
CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(50) UNIQUE NOT NULL,
    subnet VARCHAR(50),
    gateway VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    position VARCHAR(255),
    department VARCHAR(255),
    salary DECIMAL(10, 2),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RADIUS Tables for FreeRADIUS Integration

-- 10. RADIUS Users Table
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

-- 11. RADIUS Active Sessions Table
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    session_id VARCHAR(255) UNIQUE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. RADIUS Session Archive Table
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    session_id VARCHAR(255),
    start_time TIMESTAMP,
    stop_time TIMESTAMP,
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    session_duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. RADIUS NAS (Network Access Server) Table
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(255) UNIQUE NOT NULL,
    shortname VARCHAR(255),
    secret VARCHAR(255) NOT NULL,
    server VARCHAR(255),
    ports INTEGER,
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supporting Tables

-- Company Profiles Table
CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    trading_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    postal_code VARCHAR(20),
    logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Config Table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    supplier_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2),
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'in_stock',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Router Performance History Table
CREATE TABLE IF NOT EXISTS router_performance_history (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5, 2),
    memory_usage DECIMAL(5, 2),
    bandwidth_in BIGINT,
    bandwidth_out BIGINT,
    bandwidth_usage BIGINT,
    peak_usage BIGINT,
    connections INTEGER,
    latency DECIMAL(10, 2),
    packet_loss DECIMAL(5, 2),
    uptime BIGINT,
    uptime_percentage DECIMAL(5, 2),
    temperature DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance (Rule 6: sub-5ms load times)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_service_plans_status ON service_plans(status);

-- Record schema migration
INSERT INTO schema_migrations (migration_name) VALUES ('000_working_schema') ON CONFLICT (migration_name) DO NOTHING;
