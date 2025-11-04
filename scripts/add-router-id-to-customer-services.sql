-- Migration: Add router_id column to customer_services table
-- This script is idempotent and safe to run multiple times

DO $$ 
BEGIN
    -- Check if router_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customer_services' 
        AND column_name = 'router_id'
    ) THEN
        -- Add router_id column
        ALTER TABLE customer_services 
        ADD COLUMN router_id BIGINT;
        
        RAISE NOTICE 'Added router_id column to customer_services table';
        
        -- Add foreign key constraint to link to network_devices
        ALTER TABLE customer_services 
        ADD CONSTRAINT fk_customer_services_router 
        FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint fk_customer_services_router';
        
        -- Create index for better performance
        CREATE INDEX idx_customer_services_router_id ON customer_services(router_id);
        
        RAISE NOTICE 'Created index idx_customer_services_router_id';
        
        -- Update existing records to set router_id based on IP address allocation
        -- This is a best-effort update for existing data
        UPDATE customer_services cs
        SET router_id = (
            SELECT DISTINCT ip.router_id 
            FROM ip_addresses ip
            WHERE ip.customer_id = cs.customer_id
            AND ip.status = 'ASSIGNED'
            LIMIT 1
        )
        WHERE cs.router_id IS NULL;
        
        RAISE NOTICE 'Updated existing customer_services records with router_id';
        
    ELSE
        RAISE NOTICE 'Column router_id already exists in customer_services table - skipping migration';
    END IF;
END $$;

-- Success message
SELECT 'Migration completed: router_id column added to customer_services' as status;
