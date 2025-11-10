-- Add columns to customer_services table for enhanced automation
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activated_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reactivated_by VARCHAR(100);

-- Add service_id column to invoice_items for better tracking
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES customer_services(id);

-- Add paid_amount column to invoices for partial payments
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create midnight suspension scheduled task
INSERT INTO scheduled_tasks (
  name,
  description,
  task_type,
  schedule,
  timezone,
  status,
  next_run,
  configuration
) VALUES (
  'Midnight Service Suspension Check',
  'Check and suspend services that were activated with admin override but have no payment',
  'midnight_suspension_check',
  '0 0 * * *',
  'Africa/Nairobi',
  'active',
  DATE_TRUNC('day', NOW() + INTERVAL '1 day'),
  '{}'
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_services_admin_override ON customer_services(admin_override);
CREATE INDEX IF NOT EXISTS idx_customer_services_status_activated ON customer_services(status, activated_by);
CREATE INDEX IF NOT EXISTS idx_customer_services_suspension ON customer_services(suspended_at, suspension_reason);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_status ON invoices(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

-- Removed the UPDATE statement that was setting status to 'pending_payment' since that's not a valid enum value
-- Services with status 'pending' are already correct

-- Add system log entries for the enhancement
INSERT INTO system_logs (
  level,
  category,
  message,
  details,
  created_at
) VALUES (
  'info',
  'system_enhancement',
  'Service automation enhancement deployed',
  '{"features": ["automatic_invoice_creation", "payment_activation", "admin_override", "midnight_suspension"], "version": "1.0"}',
  NOW()
);
