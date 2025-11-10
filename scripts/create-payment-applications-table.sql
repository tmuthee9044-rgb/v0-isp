-- Create payment_applications table for tracking payment allocations to invoices
CREATE TABLE IF NOT EXISTS payment_applications (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_applied NUMERIC(10,2) NOT NULL CHECK (amount_applied > 0),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_payment_id ON payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_invoice_id ON payment_applications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_created_at ON payment_applications(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_applications_updated_at_trigger
    BEFORE UPDATE ON payment_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_applications_updated_at();

-- Log table creation
DO $$
BEGIN
    RAISE NOTICE 'Payment applications table created successfully';
END $$;
