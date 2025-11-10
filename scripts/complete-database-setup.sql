-- Complete ISP Management System Database Setup
-- This script creates all necessary tables and inserts sample data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TABLE IF EXISTS customer_communications CASCADE;
DROP TABLE IF EXISTS ticket_responses CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS service_outages CASCADE;
DROP TABLE IF EXISTS customer_usage CASCADE;
DROP TABLE IF EXISTS network_monitoring CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS billing_cycles CASCADE;
DROP TABLE IF EXISTS customer_emergency_contacts CASCADE;
DROP TABLE IF EXISTS customer_phone_numbers CASCADE;
DROP TABLE IF EXISTS customer_services CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS service_plans CASCADE;
DROP TABLE IF EXISTS subnets CASCADE;
DROP TABLE IF EXISTS ip_addresses CASCADE;
DROP TABLE IF EXISTS network_devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- System Configuration
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Admin and Staff)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Plans
CREATE TABLE service_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    download_speed INTEGER NOT NULL,
    upload_speed INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    data_limit INTEGER,
    fair_usage_policy TEXT,
    priority_level INTEGER DEFAULT 1,
    qos_settings JSONB,
    features JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network Devices
CREATE TABLE network_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    ip_address INET,
    mac_address VARCHAR(17),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    configuration JSONB,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IP Addresses
CREATE TABLE ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    subnet_id INTEGER,
    customer_id INTEGER,
    status VARCHAR(20) DEFAULT 'available',
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subnets
CREATE TABLE subnets (
    id SERIAL PRIMARY KEY,
    network CIDR NOT NULL,
    name VARCHAR(255),
    description TEXT,
    gateway INET,
    dns_servers INET[],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    id_number VARCHAR(50),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    tax_number VARCHAR(50),
    portal_username VARCHAR(100),
    portal_password VARCHAR(255),
    gps_coordinates VARCHAR(100),
    installation_address TEXT,
    billing_address TEXT,
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    service_preferences JSONB,
    referral_source VARCHAR(255),
    assigned_staff_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Phone Numbers
CREATE TABLE customer_phone_numbers (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    type VARCHAR(20) DEFAULT 'mobile',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Emergency Contacts
CREATE TABLE customer_emergency_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Services
CREATE TABLE customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_fee DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional tables for complete system functionality
CREATE TABLE billing_cycles (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    cycle_start DATE NOT NULL,
    cycle_end DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO system_config (key, value) VALUES
('company_name', 'TrustWaves Network'),
('company_email', 'admin@trustwavesnetwork.com'),
('company_phone', '+254-700-000-000'),
('company_address', 'Nairobi, Kenya'),
('currency', 'KES'),
('timezone', 'Africa/Nairobi');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@trustwavesnetwork.com', '$2b$10$rQZ9QmjlhQZ9QmjlhQZ9Qu', 'admin');

-- Insert sample service plans
INSERT INTO service_plans (name, description, download_speed, upload_speed, price, data_limit) VALUES
('Basic Home', 'Perfect for basic internet browsing and email', 10, 5, 2500.00, NULL),
('Standard Home', 'Great for streaming and multiple devices', 25, 10, 4500.00, NULL),
('Premium Home', 'High-speed for gaming and 4K streaming', 50, 25, 7500.00, NULL),
('Business Starter', 'Reliable internet for small businesses', 30, 15, 8500.00, NULL),
('Business Pro', 'High-performance for growing businesses', 100, 50, 15000.00, NULL);

-- Insert sample network devices
INSERT INTO network_devices (name, type, ip_address, location, status) VALUES
('Main Router', 'Router', '192.168.1.1', 'Data Center', 'active'),
('Core Switch', 'Switch', '192.168.1.2', 'Data Center', 'active'),
('Access Point 1', 'Access Point', '192.168.1.10', 'Building A', 'active');

-- Insert sample subnet
INSERT INTO subnets (network, name, description, gateway) VALUES
('192.168.1.0/24', 'Main Network', 'Primary network subnet', '192.168.1.1');

-- Insert sample customer
INSERT INTO customers (account_number, first_name, last_name, email, phone, address, city, state, postal_code, portal_username, status) VALUES
('ACC001', 'John', 'Doe', 'john.doe@example.com', '+254-700-123-456', '123 Main Street', 'Nairobi', 'Nairobi County', '00100', 'johndoe', 'active');

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_account_number ON customers(account_number);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX idx_support_tickets_customer_id ON support_tickets(customer_id);

-- Success message
SELECT 'Database setup completed successfully! All tables created and sample data inserted.' as status;
