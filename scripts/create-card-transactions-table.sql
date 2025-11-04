-- Create card_transactions table to track card payments
CREATE TABLE IF NOT EXISTS card_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    card_last_four VARCHAR(4),
    processor VARCHAR(50) DEFAULT 'demo',
    processor_response JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_transactions_payment_id ON card_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_transaction_id ON card_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(status);
