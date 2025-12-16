-- Performance indexes for billing dashboard to observe rule 6 (load under 5ms)
-- These indexes optimize the /billing page queries

-- Invoice queries optimization
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at_status ON invoices(created_at, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status ON invoices(due_date, status);

-- Customer services optimization for invoice queries
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_services_plan_status ON customer_services(service_plan_id, status);

-- Payment queries optimization  
CREATE INDEX IF NOT EXISTS idx_payments_payment_date_status ON payments(payment_date DESC, status);

-- Composite indexes for complex joins
CREATE INDEX IF NOT EXISTS idx_invoices_customer_created ON invoices(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_date_status ON payments(customer_id, payment_date DESC, status);

-- Optimize overdue calculations
CREATE INDEX IF NOT EXISTS idx_invoices_overdue_calc ON invoices(due_date, status) WHERE status NOT IN ('paid', 'cancelled');
