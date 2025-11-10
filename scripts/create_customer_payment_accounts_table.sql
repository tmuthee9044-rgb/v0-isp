-- Create customer_payment_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_payment_accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    field_1 VARCHAR(255),
    type VARCHAR(100) DEFAULT 'debit_order',
    account_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_payment_accounts_customer_id ON customer_payment_accounts(customer_id);

-- Insert default payment account for existing customers who don't have one
INSERT INTO customer_payment_accounts (customer_id, title, field_1, type)
SELECT 
    c.id,
    'Netcash Debit Order',
    '-',
    'debit_order'
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM customer_payment_accounts cpa 
    WHERE cpa.customer_id = c.id
)
AND c.id IS NOT NULL;
