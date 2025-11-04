-- Create credit applications table to track credit note applications to invoices
CREATE TABLE IF NOT EXISTS credit_applications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  adjustment_id INTEGER NOT NULL REFERENCES financial_adjustments(id),
  amount_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(invoice_id, adjustment_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_applications_customer ON credit_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_invoice ON credit_applications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_adjustment ON credit_applications(adjustment_id);

-- Add paid_amount column to invoices if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Add invoice_id column to financial_adjustments for linking
ALTER TABLE financial_adjustments ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id);
