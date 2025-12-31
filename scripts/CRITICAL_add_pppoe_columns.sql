-- CRITICAL: Add PPPoE credentials columns to customer_services table
-- This MUST be run before payment processing can activate services

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
        
        RAISE NOTICE 'Added pppoe_username column to customer_services';
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
        ADD COLUMN pppoe_password VARCHAR(255);
        
        RAISE NOTICE 'Added pppoe_password column to customer_services';
    ELSE
        RAISE NOTICE 'pppoe_password column already exists';
    END IF;
END $$;

-- Create index for faster PPPoE username lookups
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
ON customer_services(pppoe_username) 
WHERE pppoe_username IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_services' 
AND column_name IN ('pppoe_username', 'pppoe_password')
ORDER BY column_name;

-- Show success message
SELECT 'PPPoE columns successfully added to customer_services table!' AS status;
