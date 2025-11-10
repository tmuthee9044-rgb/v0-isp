-- Add activated_at column to customer_services table
ALTER TABLE customer_services 
ADD COLUMN activated_at TIMESTAMP WITHOUT TIME ZONE;

-- Update existing records to set activated_at to start_date for active services
UPDATE customer_services 
SET activated_at = start_date 
WHERE status = 'active' AND activated_at IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_services_activated_at 
ON customer_services(activated_at);
