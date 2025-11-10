-- Add missing activated_by column to customer_services table
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS activated_by VARCHAR(100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_activated_by ON customer_services(activated_by);

-- Add comment
COMMENT ON COLUMN customer_services.activated_by IS 'Who or what activated the service (admin_override, payment_received, etc.)';

-- Update existing records to have a default value
UPDATE customer_services 
SET activated_by = 'legacy_activation' 
WHERE activated_by IS NULL AND status = 'active';
