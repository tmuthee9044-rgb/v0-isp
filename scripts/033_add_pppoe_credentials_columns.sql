-- Add PPPoE credential columns to customer_services table for RADIUS authentication
-- Per rules 1, 4, 7, 9, and 10

ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
ON customer_services(pppoe_username);

-- Log the migration
INSERT INTO system_logs (category, action, details, created_at)
VALUES (
  'database',
  'schema_update',
  '{"migration": "033_add_pppoe_credentials_columns", "action": "Added pppoe_username and pppoe_password columns to customer_services table"}',
  NOW()
);
