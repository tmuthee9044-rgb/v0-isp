-- Performance indexes for faster customer lookups
-- Run this migration on your PostgreSQL database to improve query performance

-- Index on customers.id (primary key should already have this, but ensure it exists)
CREATE INDEX IF NOT EXISTS idx_customers_id ON customers(id);

-- Index on customers.account_number for lookups
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);

-- Index on customers.status for filtering
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Index on customers.customer_type for filtering
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_customers_status_type ON customers(status, customer_type);

-- Index on customer_services for faster service lookups
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);

-- Index on service_plans for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_service_plans_id ON service_plans(id);
CREATE INDEX IF NOT EXISTS idx_service_plans_status ON service_plans(status);

-- Analyze tables to update statistics for query planner
ANALYZE customers;
ANALYZE customer_services;
ANALYZE service_plans;

-- Show all created indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'customer_services', 'service_plans')
ORDER BY tablename, indexname;
