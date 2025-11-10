-- Migration: Add customer_type column to customers table (idempotent)
-- This script is safe to run multiple times

DO $$ 
BEGIN
    -- Check if customer_type column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'customer_type'
    ) THEN
        -- Add customer_type column
        ALTER TABLE customers 
        ADD COLUMN customer_type VARCHAR(20) DEFAULT 'individual' 
        CHECK (customer_type IN ('individual', 'company', 'school'));
        
        RAISE NOTICE 'Added customer_type column to customers table';
    ELSE
        RAISE NOTICE 'customer_type column already exists';
    END IF;

    -- Update existing records based on business_name
    -- If they have a business_name, they're likely a company
    UPDATE customers 
    SET customer_type = CASE 
        WHEN business_name IS NOT NULL AND business_name != '' THEN 'company'
        ELSE 'individual'
    END
    WHERE customer_type IS NULL OR customer_type = 'individual';
    
    RAISE NOTICE 'Updated existing customer records with appropriate types';

    -- Create index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'customers' 
        AND indexname = 'idx_customers_customer_type'
    ) THEN
        CREATE INDEX idx_customers_customer_type ON customers(customer_type);
        RAISE NOTICE 'Created index on customer_type column';
    ELSE
        RAISE NOTICE 'Index on customer_type already exists';
    END IF;

END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'customer_type';
