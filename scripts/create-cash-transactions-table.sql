-- Create cash_transactions table to track cash payments
CREATE TABLE IF NOT EXISTS cash_transactions (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT REFERENCES payments(id),
    transaction_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    received_by TEXT DEFAULT 'system',
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cash_transactions_payment_id ON cash_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_transaction_id ON cash_transactions(transaction_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_cash_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cash_transactions_updated_at ON cash_transactions;
CREATE TRIGGER trigger_cash_transactions_updated_at
    BEFORE UPDATE ON cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_transactions_updated_at();
