-- Performance indexes for finance revenue queries to observe rule 6 (load under 5ms)

-- Index for payments by status and date range
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);

-- Index for payments customer lookup
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

-- Index for customer_services active status lookup
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);

-- Index for customer_services plan lookup
CREATE INDEX IF NOT EXISTS idx_customer_services_plan_id ON customer_services(service_plan_id);

-- Composite index for top customers query optimization
CREATE INDEX IF NOT EXISTS idx_payments_completed_customer_date ON payments(status, customer_id, created_at) WHERE status = 'completed';

-- Index for payment method aggregation
CREATE INDEX IF NOT EXISTS idx_payments_method_status ON payments(payment_method, status);

-- Index for revenue by plan aggregation
CREATE INDEX IF NOT EXISTS idx_customer_services_active_plan ON customer_services(status, service_plan_id) WHERE status = 'active';

-- Analyze tables for optimal query planning
ANALYZE payments;
ANALYZE customer_services;
ANALYZE service_plans;
ANALYZE customers;
