-- Customer Management Module Database Schema
-- This script creates all tables required for the comprehensive customer management system

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS customer_services CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Create locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update customers table to match requirements
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive', 'recent'));

-- Create customer_services table
CREATE TABLE customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    tariff_id INTEGER REFERENCES service_plans(id),
    router_id UUID REFERENCES network_devices(id),
    ip_address INET,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('mpesa', 'card', 'paypal', 'manual', 'bank_transfer')),
    transaction_id VARCHAR(255),
    reference_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create usage_logs table
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    download_mb BIGINT DEFAULT 0,
    upload_mb BIGINT DEFAULT 0,
    total_mb BIGINT GENERATED ALWAYS AS (download_mb + upload_mb) STORED,
    session_duration_minutes INTEGER DEFAULT 0,
    peak_speed_mbps DECIMAL(8,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date DATE DEFAULT CURRENT_DATE
);

-- Create tickets table
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'resolved')),
    category VARCHAR(100),
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket_responses table for ticket communication
CREATE TABLE ticket_responses (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments TEXT[], -- Array of file paths
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_documents table for file uploads
CREATE TABLE customer_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'id_copy', 'business_permit', 'contract', etc.
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_notes table for internal notes
CREATE TABLE customer_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'technical', 'billing', 'support'
    is_important BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_communications table for bulk messaging
CREATE TABLE customer_communications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sms', 'email', 'call', 'whatsapp')),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    sent_by INTEGER REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP
);

-- Create service_suspensions table for tracking suspensions
CREATE TABLE service_suspensions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    suspended_by INTEGER REFERENCES users(id),
    suspended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reactivated_at TIMESTAMP,
    reactivated_by INTEGER REFERENCES users(id),
    notes TEXT
);

-- Create service_extensions table for extending service days
CREATE TABLE service_extensions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    extension_days INTEGER NOT NULL,
    reason TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    extended_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_location ON customers(location_id);
CREATE INDEX idx_customers_created_at ON customers(created_at);

CREATE INDEX idx_customer_services_customer ON customer_services(customer_id);
CREATE INDEX idx_customer_services_status ON customer_services(status);
CREATE INDEX idx_customer_services_tariff ON customer_services(tariff_id);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX idx_usage_logs_date ON usage_logs(date);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);

CREATE INDEX idx_ticket_responses_ticket ON ticket_responses(ticket_id);
CREATE INDEX idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX idx_customer_communications_type ON customer_communications(type);

-- Insert sample locations
INSERT INTO locations (name, description) VALUES
('Nairobi Central', 'Main coverage area in Nairobi CBD'),
('Westlands', 'Westlands and surrounding areas'),
('Karen', 'Karen, Langata and surrounding suburbs'),
('Mombasa', 'Mombasa coastal region'),
('Kisumu', 'Kisumu and western Kenya coverage'),
('Nakuru', 'Nakuru and Rift Valley region');

-- Generate invoice numbers function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate ticket numbers function
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-generating numbers
CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(12,2);
    invoice_total DECIMAL(12,2);
BEGIN
    -- Get total amount paid for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments 
    WHERE invoice_id = NEW.invoice_id AND status = 'completed';
    
    -- Get invoice total
    SELECT total_amount INTO invoice_total
    FROM invoices 
    WHERE id = NEW.invoice_id;
    
    -- Update invoice status
    IF total_paid >= invoice_total THEN
        UPDATE invoices SET status = 'paid' WHERE id = NEW.invoice_id;
    ELSIF total_paid > 0 THEN
        UPDATE invoices SET status = 'partial' WHERE id = NEW.invoice_id;
    ELSE
        UPDATE invoices SET status = 'unpaid' WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_status();

-- Create view for customer dashboard summary
CREATE OR REPLACE VIEW customer_dashboard_summary AS
SELECT 
    c.id,
    c.name,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.status,
    l.name as location_name,
    sp.name as service_plan_name,
    sp.speed_mbps,
    sp.price_kes as monthly_fee,
    cs.status as service_status,
    cs.start_date as service_start_date,
    cs.end_date as service_end_date,
    COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.total_amount ELSE 0 END), 0) as outstanding_balance,
    COUNT(CASE WHEN t.status IN ('open', 'pending') THEN 1 END) as open_tickets,
    COALESCE(ul.total_usage_gb, 0) as current_month_usage_gb
FROM customers c
LEFT JOIN locations l ON c.location_id = l.id
LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
LEFT JOIN service_plans sp ON cs.tariff_id = sp.id
LEFT JOIN invoices i ON c.id = i.customer_id
LEFT JOIN tickets t ON c.id = t.customer_id
LEFT JOIN (
    SELECT 
        customer_id,
        ROUND(SUM(total_mb) / 1024.0, 2) as total_usage_gb
    FROM usage_logs 
    WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY customer_id
) ul ON c.id = ul.customer_id
GROUP BY c.id, c.name, c.first_name, c.last_name, c.email, c.phone, c.status, 
         l.name, sp.name, sp.speed_mbps, sp.price_kes, cs.status, cs.start_date, cs.end_date, ul.total_usage_gb;

-- Create view for admin reports
CREATE OR REPLACE VIEW admin_customer_stats AS
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_customers,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_customers,
    COUNT(CASE WHEN status = 'recent' OR created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_customers,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as new_this_week,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_this_month,
    COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.total_amount ELSE 0 END), 0) as total_outstanding,
    COALESCE(SUM(CASE WHEN p.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as revenue_this_month
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'completed';
