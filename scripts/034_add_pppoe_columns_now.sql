-- Add PPPoE credential columns to customer_services table
-- This enables storing customer PPPoE usernames and passwords for RADIUS authentication

DO $$ 
BEGIN
    -- Add pppoe_username column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_services' 
        AND column_name = 'pppoe_username'
    ) THEN
        ALTER TABLE customer_services 
        ADD COLUMN pppoe_username VARCHAR(255);
        
        RAISE NOTICE 'Added pppoe_username column to customer_services';
    ELSE
        RAISE NOTICE 'pppoe_username column already exists';
    END IF;

    -- Add pppoe_password column if it doesn't exist
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

-- Create index for faster lookups by PPPoE username
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
ON customer_services(pppoe_username);

-- Log the migration
INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
) VALUES (
    1,
    'DATABASE_MIGRATION',
    'customer_services',
    0,
    'Added pppoe_username and pppoe_password columns for RADIUS authentication',
    NOW()
);

RAISE NOTICE 'Migration completed successfully - PPPoE columns added to customer_services table';
