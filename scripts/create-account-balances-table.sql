-- Create account_balances table for customer balance tracking
CREATE TABLE IF NOT EXISTS account_balances (
    id BIGSERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    last_payment_date TIMESTAMPTZ,
    last_invoice_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_balances_customer_id ON account_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_balance ON account_balances(balance);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_account_balances_updated_at
    BEFORE UPDATE ON account_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balances_updated_at();

-- Initialize account balances for existing customers
INSERT INTO account_balances (customer_id, balance, credit_limit, last_payment_date, last_invoice_date)
SELECT 
    c.id,
    COALESCE(
        (SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id AND p.status = 'completed'), 0
    ) - COALESCE(
        (SELECT SUM(i.amount) FROM invoices i WHERE i.customer_id = c.id), 0
    ) as balance,
    1000.00 as credit_limit, -- Default credit limit
    (SELECT MAX(p.created_at) FROM payments p WHERE p.customer_id = c.id AND p.status = 'completed'),
    (SELECT MAX(i.created_at) FROM invoices i WHERE i.customer_id = c.id)
FROM customers c
ON CONFLICT (customer_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    last_payment_date = EXCLUDED.last_payment_date,
    last_invoice_date = EXCLUDED.last_invoice_date,
    updated_at = NOW();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Account balances table created and initialized successfully';
END $$;
