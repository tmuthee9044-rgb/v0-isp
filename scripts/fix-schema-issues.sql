-- Fix database schema issues identified in error logs

-- 1. Add missing service_id column to invoice_items table
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES customer_services(id);

-- 2. Add missing columns to invoices table for better payment tracking
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'invoice';

-- 3. Add missing columns to tax_returns table to match API expectations
ALTER TABLE tax_returns 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_authority VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_status ON invoices(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_tax_returns_due_date ON tax_returns(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_returns_status ON tax_returns(status);

-- 5. Add system log entry for the fix
INSERT INTO system_logs (
  level,
  category,
  message,
  details,
  created_at
) VALUES (
  'info',
  'schema_fix',
  'Database schema issues resolved',
  '{"fixes": ["added_service_id_to_invoice_items", "added_payment_tracking_to_invoices", "enhanced_tax_returns_table"], "version": "1.1"}',
  NOW()
);
