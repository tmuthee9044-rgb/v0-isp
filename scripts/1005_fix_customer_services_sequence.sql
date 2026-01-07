-- Fix customer_services id sequence to ensure auto-increment works properly
-- This resolves the "null value in column 'id' violates not-null constraint" error

-- Recreate the sequence if it's missing or broken
DROP SEQUENCE IF EXISTS customer_services_id_seq CASCADE;
CREATE SEQUENCE customer_services_id_seq;

-- Set the sequence ownership to the id column
ALTER SEQUENCE customer_services_id_seq OWNED BY customer_services.id;

-- Set the current value to the max id + 1
SELECT setval('customer_services_id_seq', COALESCE((SELECT MAX(id) FROM customer_services), 0) + 1, false);

-- Ensure the id column uses the sequence as default
ALTER TABLE customer_services ALTER COLUMN id SET DEFAULT nextval('customer_services_id_seq');

-- Ensure id column is NOT NULL
ALTER TABLE customer_services ALTER COLUMN id SET NOT NULL;

-- Add index on customer_id for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_service_plan_id ON customer_services(service_plan_id);
