-- Migration to ensure payments table has reference column
-- This is safe to run multiple times

-- Add reference column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'reference'
    ) THEN
        ALTER TABLE payments ADD COLUMN reference varchar;
    END IF;
END $$;

-- Ensure payments table has all required fields with proper constraints
ALTER TABLE payments 
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'SUCCESS';

-- Add check constraint for status values if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'payments_status_check'
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'));
    END IF;
END $$;

-- Add received_at column if missing and set default
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'received_at'
    ) THEN
        ALTER TABLE payments ADD COLUMN received_at timestamp DEFAULT now();
    END IF;
END $$;

-- Update existing records to have received_at if null
UPDATE payments 
SET received_at = created_at 
WHERE received_at IS NULL;

-- Create index for better performance on reference lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_reference 
ON payments(reference) WHERE reference IS NOT NULL;

-- Create index for better performance on customer lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_customer_received 
ON payments(customer_id, received_at DESC);
