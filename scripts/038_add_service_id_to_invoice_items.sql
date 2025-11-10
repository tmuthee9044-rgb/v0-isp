-- Add missing service_id column to invoice_items table
-- This fixes the error: column "service_id" of relation "invoice_items" does not exist

ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES customer_services(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

-- Add comment to document the column
COMMENT ON COLUMN invoice_items.service_id IS 'References the customer service that this invoice item is for';

-- Log the fix
INSERT INTO system_logs (
  level,
  category,
  message,
  details,
  created_at
) VALUES (
  'info',
  'schema_fix',
  'Added service_id column to invoice_items table',
  '{"table": "invoice_items", "column": "service_id", "type": "INTEGER", "references": "customer_services(id)"}',
  NOW()
);
