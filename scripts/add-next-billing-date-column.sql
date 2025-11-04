-- Add missing next_billing_date column to customer_services table
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Update existing records with calculated next billing dates
UPDATE customer_services 
SET next_billing_date = CASE 
  WHEN start_date IS NOT NULL THEN start_date + INTERVAL '1 month'
  ELSE CURRENT_DATE + INTERVAL '1 month'
END
WHERE next_billing_date IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_services_next_billing_date 
ON customer_services(next_billing_date);

-- Create index for active services with billing dates
CREATE INDEX IF NOT EXISTS idx_customer_services_active_billing 
ON customer_services(status, next_billing_date) 
WHERE status = 'active';
