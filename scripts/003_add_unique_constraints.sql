-- Script to add missing unique constraints to existing tables
-- This fixes the ON CONFLICT error by ensuring required unique constraints exist

-- Add unique constraint to customers.email if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_email_key' 
        AND conrelid = 'customers'::regclass
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);
    END IF;
END $$;

-- Add unique constraint to customers.account_number if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_account_number_key' 
        AND conrelid = 'customers'::regclass
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_account_number_key UNIQUE (account_number);
    END IF;
END $$;

-- Add index on email for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Add index on account_number for performance
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
