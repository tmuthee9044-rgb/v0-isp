-- Migration: Add created_at column to account_balances table
-- This fixes the schema mismatch between the database and application code

DO $$
BEGIN
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'account_balances' 
        AND column_name = 'created_at'
    ) THEN
        -- Add created_at column with default value
        ALTER TABLE account_balances 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update existing rows to have a created_at value
        UPDATE account_balances 
        SET created_at = COALESCE(updated_at, NOW())
        WHERE created_at IS NULL;
        
        RAISE NOTICE 'Successfully added created_at column to account_balances table';
    ELSE
        RAISE NOTICE 'created_at column already exists in account_balances table';
    END IF;
END $$;

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'account_balances' 
        AND column_name = 'created_at'
    ) THEN
        RAISE NOTICE 'Verification successful: created_at column is now present';
    ELSE
        RAISE WARNING 'Verification failed: created_at column was not added';
    END IF;
END $$;
