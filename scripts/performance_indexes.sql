-- Add performance indexes for faster queries

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON payments(status, payment_date);

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_status_created ON customers(status, created_at);

-- Customer services table indexes
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_created_at ON customer_services(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_services_status_created ON customer_services(status, created_at);

-- Network devices table indexes
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);

-- Support tickets table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- Analyze tables for query optimization
ANALYZE payments;
ANALYZE invoices;
ANALYZE customers;
ANALYZE customer_services;
ANALYZE network_devices;
