-- Add performance indexes for faster queries

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON payments(status, payment_date);
-- Adding customer_id index for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_status ON payments(payment_method, status);

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);
-- Adding customer_id index for faster invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_status_created ON customers(status, created_at);
-- Adding indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_type_status ON customers(customer_type, status);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city) WHERE city IS NOT NULL;

-- Customer services table indexes
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_created_at ON customer_services(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_services_status_created ON customer_services(status, created_at);
-- Adding composite index for customer and status queries
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);

-- Network devices table indexes
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);

-- Support tickets table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
-- Adding customer_id index for ticket lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_status ON support_tickets(customer_id, status);

-- Adding IP and network management indexes for performance
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_status ON ip_addresses(subnet_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip ON customer_services(ip_address) WHERE ip_address IS NOT NULL;

-- Adding inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

-- Adding finance-specific indexes for Rule 7 compliance
-- Expenses table indexes for fast date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON expenses(status, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, expense_date);

-- Supplier invoices indexes for accounts payable
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON supplier_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_status ON supplier_invoices(supplier_id, status);

-- Finance audit trail index
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_timestamp ON finance_audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_resource ON finance_audit_trail(resource_type, resource_id);

-- Tax returns indexes
CREATE INDEX IF NOT EXISTS idx_tax_returns_due_date ON tax_returns(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_returns_status ON tax_returns(status);

-- Analyze tables for query optimization
ANALYZE payments;
ANALYZE invoices;
ANALYZE customers;
ANALYZE customer_services;
ANALYZE network_devices;
-- Analyzing additional tables
ANALYZE support_tickets;
ANALYZE ip_addresses;
ANALYZE inventory;
-- Analyzing finance tables
ANALYZE expenses;
ANALYZE supplier_invoices;
ANALYZE finance_audit_trail;
ANALYZE tax_returns;
