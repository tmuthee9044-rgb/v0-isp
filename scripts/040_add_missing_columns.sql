-- Add missing columns to fix database schema errors
-- Created: 2025-10-04

-- Add suspension_reason column to customer_services table
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

COMMENT ON COLUMN customer_services.suspension_reason IS 'Reason for service suspension (e.g., non-payment, customer request, technical issue)';

-- Add invoice_type column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'standard';

COMMENT ON COLUMN invoices.invoice_type IS 'Type of invoice (e.g., standard, prorated, adjustment, credit_note)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_services_suspension_reason 
ON customer_services(suspension_reason) 
WHERE suspension_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type 
ON invoices(invoice_type);

-- Log the changes
INSERT INTO system_logs (
  message,
  level,
  category,
  source,
  details,
  timestamp,
  created_at
) VALUES (
  'Added missing columns: suspension_reason to customer_services and invoice_type to invoices',
  'info',
  'database',
  'migration',
  '{"script": "040_add_missing_columns.sql", "columns_added": ["customer_services.suspension_reason", "invoices.invoice_type"]}'::jsonb,
  NOW(),
  NOW()
);
