-- Create finance_documents table to store various financial documents
CREATE TABLE IF NOT EXISTS finance_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    type VARCHAR(50) NOT NULL, -- 'invoice', 'receipt', 'statement', 'credit_note', etc.
    reference_number VARCHAR(100) UNIQUE,
    invoice_number VARCHAR(100),
    description TEXT,
    notes TEXT,
    amount NUMERIC(10,2),
    total_amount NUMERIC(10,2),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    due_date DATE,
    invoice_date DATE,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    metadata JSONB -- For storing additional document-specific data
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_finance_documents_customer_id ON finance_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_finance_documents_type ON finance_documents(type);
CREATE INDEX IF NOT EXISTS idx_finance_documents_status ON finance_documents(status);
CREATE INDEX IF NOT EXISTS idx_finance_documents_reference_number ON finance_documents(reference_number);

-- Insert some sample finance documents for existing customers
INSERT INTO finance_documents (customer_id, type, reference_number, invoice_number, description, amount, total_amount, status, due_date, invoice_date, created_by) VALUES
(1015, 'invoice', 'INV-2024-001', 'INV-001', 'Monthly Internet Service - January 2024', 2500.00, 2500.00, 'paid', '2024-02-15', '2024-01-15', 1),
(1015, 'receipt', 'RCP-2024-001', NULL, 'Payment received for INV-001', 2500.00, 2500.00, 'completed', NULL, '2024-02-10', 1),
(1015, 'statement', 'STMT-2024-Q1', NULL, 'Quarterly Account Statement - Q1 2024', 7500.00, 7500.00, 'sent', NULL, '2024-03-31', 1),
(1015, 'payment', 'PAY-1015-1758590559823', NULL, 'Payment for trust waves networks joseph', 1500.00, 1500.00, 'completed', NULL, '2025-09-22', 1);
