-- Performance indexes for customer detail page to observe Rule 7 (load under 5ms)
-- These indexes optimize the main customer query with all joins

-- Customer lookup by ID (primary key already indexed, but ensuring it exists)
CREATE INDEX IF NOT EXISTS idx_customers_id ON customers(id);

-- Customer phone numbers - optimize join
CREATE INDEX IF NOT EXISTS idx_customer_phone_numbers_customer_id ON customer_phone_numbers(customer_id);

-- Emergency contacts - optimize join
CREATE INDEX IF NOT EXISTS idx_customer_emergency_contacts_customer_id ON customer_emergency_contacts(customer_id);

-- Customer services - optimize join and status filtering
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_status ON customer_services(customer_id, status);

-- Service plans - optimize join
CREATE INDEX IF NOT EXISTS idx_service_plans_id ON service_plans(id);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_customer_services_lookup ON customer_services(customer_id, service_plan_id, status);

-- Analyze tables to update query planner statistics
ANALYZE customers;
ANALYZE customer_phone_numbers;
ANALYZE customer_emergency_contacts;
ANALYZE customer_services;
ANALYZE service_plans;
