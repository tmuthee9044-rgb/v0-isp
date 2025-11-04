-- Added customer statements table for automated statement generation
CREATE TABLE IF NOT EXISTS customer_statements (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  statement_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  closing_balance DECIMAL(10,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  statement_number VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'sent', 'viewed'
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generate statement numbers automatically
CREATE OR REPLACE FUNCTION generate_statement_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.statement_number := 'STMT-' || TO_CHAR(NEW.created_at, 'YYYY') || '-' || LPAD(NEW.id::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_statement_number
  BEFORE INSERT ON customer_statements
  FOR EACH ROW
  EXECUTE FUNCTION generate_statement_number();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_statements_customer ON customer_statements(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_statements_date ON customer_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_customer_statements_period ON customer_statements(period_start, period_end);
