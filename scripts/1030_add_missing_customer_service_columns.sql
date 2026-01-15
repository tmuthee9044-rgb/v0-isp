-- Add missing columns to customer_services table for suspension tracking, provisioning status, and session management
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_provisioned BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customer_services_suspended_at ON customer_services(suspended_at);
CREATE INDEX IF NOT EXISTS idx_customer_services_next_billing_date ON customer_services(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_customer_services_is_online ON customer_services(is_online);
