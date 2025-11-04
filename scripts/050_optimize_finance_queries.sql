-- Add indexes to optimize finance document and transaction queries

-- Indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_customer_date ON invoices(customer_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status IN ('pending', 'overdue');

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_status ON payments(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(customer_id, created_at DESC);

-- Indexes for credit_notes table
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_date ON credit_notes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_status ON credit_notes(customer_id, status);

-- Composite index for overdue invoice checks
CREATE INDEX IF NOT EXISTS idx_invoices_overdue_check ON invoices(customer_id, status, due_date) 
WHERE status IN ('pending', 'overdue', 'partial');

-- Index for payment applications
CREATE INDEX IF NOT EXISTS idx_payment_applications_payment ON payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_invoice ON payment_applications(invoice_id);

COMMENT ON INDEX idx_invoices_customer_date IS 'Optimizes finance document queries by customer and date';
COMMENT ON INDEX idx_payments_customer_date IS 'Optimizes payment history queries';
COMMENT ON INDEX idx_invoices_overdue_check IS 'Optimizes overdue invoice detection for automated billing';
