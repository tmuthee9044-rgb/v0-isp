-- Add PPPoE credential columns to customer_services table
-- This fixes the error: column "pppoe_username" of relation "customer_services" does not exist

-- Add pppoe_username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_services' 
        AND column_name = 'pppoe_username'
    ) THEN
        ALTER TABLE customer_services 
        ADD COLUMN pppoe_username VARCHAR(100);
        
        RAISE NOTICE 'Added pppoe_username column';
    ELSE
        RAISE NOTICE 'pppoe_username column already exists';
    END IF;
END $$;

-- Add pppoe_password column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_services' 
        AND column_name = 'pppoe_password'
    ) THEN
        ALTER TABLE customer_services 
        ADD COLUMN pppoe_password VARCHAR(100);
        
        RAISE NOTICE 'Added pppoe_password column';
    ELSE
        RAISE NOTICE 'pppoe_password column already exists';
    END IF;
END $$;

-- Create index on pppoe_username for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
ON customer_services(pppoe_username);

-- Show the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_services' 
AND column_name IN ('pppoe_username', 'pppoe_password')
ORDER BY column_name;
