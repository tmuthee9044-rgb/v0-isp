-- Create finance_documents table for storing financial documents
CREATE TABLE IF NOT EXISTS finance_documents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'invoice', 'receipt', 'statement', 'credit_note', 'payment_confirmation'
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'KES',
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'issued', 'sent', 'viewed', 'paid', 'cancelled'
  issue_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(50),
  related_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  related_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_documents_customer_id ON finance_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_finance_documents_type ON finance_documents(type);
CREATE INDEX IF NOT EXISTS idx_finance_documents_status ON finance_documents(status);
CREATE INDEX IF NOT EXISTS idx_finance_documents_reference_number ON finance_documents(reference_number);
CREATE INDEX IF NOT EXISTS idx_finance_documents_issue_date ON finance_documents(issue_date);
CREATE INDEX IF NOT EXISTS idx_finance_documents_related_invoice ON finance_documents(related_invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_documents_related_payment ON finance_documents(related_payment_id);

-- Insert sample finance documents for customer 1015
INSERT INTO finance_documents (
  customer_id, type, reference_number, title, description, amount, status, 
  issue_date, due_date, file_url, file_type, notes
) VALUES
  (1015, 'invoice', 'INV-2024-001015', 'Monthly Internet Service - January 2024', 
   'Internet service subscription for January 2024', 2500.00, 'paid', 
   '2024-01-01', '2024-01-15', '/documents/invoices/inv-2024-001015.pdf', 'application/pdf',
   'Paid via M-Pesa on 2024-01-10'),
  
  (1015, 'receipt', 'RCP-2024-001015', 'Payment Receipt - January 2024', 
   'Payment received for invoice INV-2024-001015', 2500.00, 'issued', 
   '2024-01-10', NULL, '/documents/receipts/rcp-2024-001015.pdf', 'application/pdf',
   'M-Pesa transaction ID: QA12345678'),
  
  (1015, 'invoice', 'INV-2024-002015', 'Monthly Internet Service - February 2024', 
   'Internet service subscription for February 2024', 2500.00, 'paid', 
   '2024-02-01', '2024-02-15', '/documents/invoices/inv-2024-002015.pdf', 'application/pdf',
   'Paid via M-Pesa on 2024-02-08'),
  
  (1015, 'statement', 'STMT-2024-Q1-1015', 'Account Statement - Q1 2024', 
   'Quarterly account statement for January-March 2024', 7500.00, 'issued', 
   '2024-03-31', NULL, '/documents/statements/stmt-2024-q1-1015.pdf', 'application/pdf',
   'Summary of all transactions for Q1 2024'),
  
  (1015, 'payment_confirmation', 'PAY-2024-046', 'Payment Confirmation - March 2024', 
   'Payment confirmation for invoice INV-2024-003015', 2500.00, 'issued', 
   '2024-03-12', NULL, '/documents/payments/pay-2024-046.pdf', 'application/pdf',
   'Payment processed successfully via M-Pesa');

-- Log the table creation
INSERT INTO system_logs (event_type, description, severity, metadata)
VALUES (
  'schema_update',
  'Created finance_documents table with indexes and sample data',
  'info',
  '{"table": "finance_documents", "indexes": 7, "sample_records": 5}'
);
