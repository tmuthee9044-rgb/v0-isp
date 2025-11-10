-- Create refunds table for tracking refund processing
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  adjustment_id INTEGER NOT NULL REFERENCES financial_adjustments(id),
  amount DECIMAL(10,2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL, -- 'mpesa', 'bank_transfer', 'check', etc.
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transaction_reference VARCHAR(100),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created ON refunds(created_at);

-- Add metadata column to financial_adjustments for additional data
ALTER TABLE financial_adjustments ADD COLUMN IF NOT EXISTS metadata JSONB;
