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
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS customer_services CASCADE;
DROP TABLE IF EXISTS service_plans CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
-- Adding RADIUS tables for FreeRADIUS integration
DROP TABLE IF EXISTS radius_sessions_archive CASCADE;
DROP TABLE IF EXISTS radius_sessions_active CASCADE;
DROP TABLE IF EXISTS radius_nas CASCADE;
DROP TABLE IF EXISTS radius_users CASCADE;

-- Create schema_migrations table first (for tracking)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core Tables

-- 1. Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Plans Table
CREATE TABLE service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    speed_download INTEGER,
    speed_upload INTEGER,
    data_limit INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    setup_fee DECIMAL(10, 2) DEFAULT 0.00,
    fup_limit INTEGER,
    fup_speed INTEGER,
    contract_period INTEGER DEFAULT 12,
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

-- 5b. Invoice Items Table (for itemized invoices)
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
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
    status VARCHAR(50) DEFAULT 'active',
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

-- RADIUS Tables for FreeRADIUS Integration (Rules 9 and 10)
-- Architecture: ISP System -> PostgreSQL -> FreeRADIUS -> NAS

-- 12. RADIUS Users Table (stores customer authentication data)
CREATE TABLE radius_users (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    group_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    download_limit BIGINT,
    upload_limit BIGINT,
    simultaneous_use INTEGER DEFAULT 1,
    expiration TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. RADIUS NAS Table (Network Access Servers - routers/access points)
CREATE TABLE radius_nas (
    id SERIAL PRIMARY KEY,
    nas_name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'other',
    ip_address VARCHAR(50) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    ports INTEGER DEFAULT 1812,
    community VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. RADIUS Active Sessions Table (current online users)
CREATE TABLE radius_sessions_active (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    nas_port_id VARCHAR(50),
    framed_ip_address VARCHAR(50),
    calling_station_id VARCHAR(100),
    called_station_id VARCHAR(100),
    acct_start_time TIMESTAMP NOT NULL,
    acct_update_time TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    input_packets BIGINT DEFAULT 0,
    output_packets BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. RADIUS Session Archive Table (historical session data)
CREATE TABLE radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    nas_ip_address VARCHAR(50),
    nas_port_id VARCHAR(50),
    framed_ip_address VARCHAR(50),
    calling_station_id VARCHAR(100),
    called_station_id VARCHAR(100),
    acct_start_time TIMESTAMP NOT NULL,
    acct_stop_time TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    terminate_cause VARCHAR(100),
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    input_packets BIGINT DEFAULT 0,
    output_packets BIGINT DEFAULT 0,
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
-- Adding invoice_items indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
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
-- Adding RADIUS indexes for performance
CREATE INDEX idx_radius_users_customer_id ON radius_users(customer_id);
CREATE INDEX idx_radius_users_username ON radius_users(username);
CREATE INDEX idx_radius_users_status ON radius_users(status);
CREATE INDEX idx_radius_nas_ip_address ON radius_nas(ip_address);
CREATE INDEX idx_radius_nas_status ON radius_nas(status);
CREATE INDEX idx_radius_sessions_active_customer_id ON radius_sessions_active(customer_id);
CREATE INDEX idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX idx_radius_sessions_active_session_id ON radius_sessions_active(session_id);
CREATE INDEX idx_radius_sessions_archive_customer_id ON radius_sessions_archive(customer_id);
CREATE INDEX idx_radius_sessions_archive_username ON radius_sessions_archive(username);
CREATE INDEX idx_radius_sessions_archive_start_time ON radius_sessions_archive(acct_start_time);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_plans_updated_at BEFORE UPDATE ON service_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_services_updated_at BEFORE UPDATE ON customer_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_radius_users_updated_at BEFORE UPDATE ON radius_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Record this migration
INSERT INTO schema_migrations (migration_name) VALUES ('000_complete_schema.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Total tables created: 15';
    RAISE NOTICE 'Core tables: customers, service_plans, customer_services, payments, invoices, invoice_items';
    RAISE NOTICE 'RADIUS tables: radius_users, radius_nas, radius_sessions_active, radius_sessions_archive';
    RAISE NOTICE 'Total indexes created: 31';
END $$;
