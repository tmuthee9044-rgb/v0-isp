-- ================================================
-- Performance Optimization Indexes for Rule 7
-- All pages should load under 5ms
-- ================================================

-- Customer queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_lower ON customers(LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_status_created ON customers(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_type_status ON customers(customer_type, status);

-- Services and billing optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_customer_created ON payments(customer_id, created_at DESC);

-- Support tickets optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_customer_status ON support_tickets(customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status_created ON support_tickets(status, created_at DESC);

-- Network and IP management optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ip_addresses_subnet_status ON ip_addresses(subnet_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_services_ip ON customer_services(ip_address) WHERE ip_address IS NOT NULL;

-- Inventory optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_category_status ON inventory(category, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_status_updated ON inventory(status, updated_at DESC);

-- Equipment and assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_assignments_customer ON equipment_assignments(customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_assignments_item ON equipment_assignments(inventory_item_id);

-- Financial transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_due_status ON invoices(due_date, status) WHERE status != 'paid';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_method_status ON payments(payment_method, status);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(business_name, '') || ' ' || COALESCE(email, '')));

-- Analyze tables after index creation
ANALYZE customers;
ANALYZE customer_services;
ANALYZE invoices;
ANALYZE payments;
ANALYZE support_tickets;
ANALYZE ip_addresses;
ANALYZE inventory;
