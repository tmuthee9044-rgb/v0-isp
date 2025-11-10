-- Create payment_applications table to track how payments are applied to invoices
CREATE TABLE IF NOT EXISTS payment_applications (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_applied DECIMAL(10,2) NOT NULL CHECK (amount_applied > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure we don't double-apply payments
    UNIQUE(payment_id, invoice_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_payment_id ON payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_invoice_id ON payment_applications(invoice_id);

-- Create cash_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    received_by VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for cash transactions
CREATE INDEX IF NOT EXISTS idx_cash_transactions_payment_id ON cash_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_transaction_id ON cash_transactions(transaction_id);
