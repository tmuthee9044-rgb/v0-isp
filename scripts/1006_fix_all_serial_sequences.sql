-- Fix all SERIAL sequences to ensure auto-increment works properly
-- This resolves "null value in column 'id' violates not-null constraint" errors

-- Fix customer_services sequence
DROP SEQUENCE IF EXISTS customer_services_id_seq CASCADE;
CREATE SEQUENCE customer_services_id_seq;
SELECT setval('customer_services_id_seq', COALESCE((SELECT MAX(id) FROM customer_services), 0) + 1, false);
ALTER TABLE customer_services ALTER COLUMN id SET DEFAULT nextval('customer_services_id_seq');
ALTER TABLE customer_services ALTER COLUMN id SET NOT NULL;

-- Fix customer_billing_configurations sequence
DROP SEQUENCE IF EXISTS customer_billing_configurations_id_seq CASCADE;
CREATE SEQUENCE customer_billing_configurations_id_seq;
SELECT setval('customer_billing_configurations_id_seq', COALESCE((SELECT MAX(id) FROM customer_billing_configurations), 0) + 1, false);
ALTER TABLE customer_billing_configurations ALTER COLUMN id SET DEFAULT nextval('customer_billing_configurations_id_seq');
ALTER TABLE customer_billing_configurations ALTER COLUMN id SET NOT NULL;

-- Fix invoices sequence
DROP SEQUENCE IF EXISTS invoices_id_seq CASCADE;
CREATE SEQUENCE invoices_id_seq;
SELECT setval('invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 0) + 1, false);
ALTER TABLE invoices ALTER COLUMN id SET DEFAULT nextval('invoices_id_seq');
ALTER TABLE invoices ALTER COLUMN id SET NOT NULL;

-- Fix invoice_items sequence
DROP SEQUENCE IF EXISTS invoice_items_id_seq CASCADE;
CREATE SEQUENCE invoice_items_id_seq;
SELECT setval('invoice_items_id_seq', COALESCE((SELECT MAX(id) FROM invoice_items), 0) + 1, false);
ALTER TABLE invoice_items ALTER COLUMN id SET DEFAULT nextval('invoice_items_id_seq');
ALTER TABLE invoice_items ALTER COLUMN id SET NOT NULL;

-- Fix payments sequence
DROP SEQUENCE IF EXISTS payments_id_seq CASCADE;
CREATE SEQUENCE payments_id_seq;
SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 0) + 1, false);
ALTER TABLE payments ALTER COLUMN id SET DEFAULT nextval('payments_id_seq');
ALTER TABLE payments ALTER COLUMN id SET NOT NULL;

-- Fix account_balances sequence
DROP SEQUENCE IF EXISTS account_balances_id_seq CASCADE;
CREATE SEQUENCE account_balances_id_seq;
SELECT setval('account_balances_id_seq', COALESCE((SELECT MAX(id) FROM account_balances), 0) + 1, false);
ALTER TABLE account_balances ALTER COLUMN id SET DEFAULT nextval('account_balances_id_seq');
ALTER TABLE account_balances ALTER COLUMN id SET NOT NULL;

-- Fix system_logs sequence
DROP SEQUENCE IF EXISTS system_logs_id_seq CASCADE;
CREATE SEQUENCE system_logs_id_seq;
SELECT setval('system_logs_id_seq', COALESCE((SELECT MAX(id) FROM system_logs), 0) + 1, false);
ALTER TABLE system_logs ALTER COLUMN id SET DEFAULT nextval('system_logs_id_seq');
ALTER TABLE system_logs ALTER COLUMN id SET NOT NULL;

-- Add performance indexes for sub-5ms queries per rule 6
CREATE INDEX IF NOT EXISTS idx_customer_billing_configurations_customer_id ON customer_billing_configurations(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_account_balances_customer_id ON account_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
