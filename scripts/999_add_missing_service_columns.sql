-- Migration: Add missing columns to customer_services and network_devices tables
-- Created: 2026-01-03
-- Description: Adds connection configuration columns for service management

-- Add missing columns to customer_services table
DO $$
BEGIN
    -- Add mac_address column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'mac_address') THEN
        ALTER TABLE customer_services ADD COLUMN mac_address VARCHAR(17);
        CREATE INDEX idx_customer_services_mac_address ON customer_services(mac_address);
        RAISE NOTICE 'Added mac_address column to customer_services';
    END IF;
    
    -- Add pppoe_username column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'pppoe_username') THEN
        ALTER TABLE customer_services ADD COLUMN pppoe_username VARCHAR(100);
        CREATE INDEX idx_customer_services_pppoe_username ON customer_services(pppoe_username);
        RAISE NOTICE 'Added pppoe_username column to customer_services';
    END IF;
    
    -- Add pppoe_password column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'pppoe_password') THEN
        ALTER TABLE customer_services ADD COLUMN pppoe_password VARCHAR(100);
        RAISE NOTICE 'Added pppoe_password column to customer_services';
    END IF;
    
    -- Add lock_to_mac column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'lock_to_mac') THEN
        ALTER TABLE customer_services ADD COLUMN lock_to_mac BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added lock_to_mac column to customer_services';
    END IF;
    
    -- Add auto_renew column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'auto_renew') THEN
        ALTER TABLE customer_services ADD COLUMN auto_renew BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_renew column to customer_services';
    END IF;
    
    -- Add location_id column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'customer_services' AND column_name = 'location_id') THEN
        ALTER TABLE customer_services ADD COLUMN location_id INTEGER;
        RAISE NOTICE 'Added location_id column to customer_services';
    END IF;
    
    RAISE NOTICE 'Customer services table migration completed';
END $$;

-- Add missing column to network_devices table
DO $$
BEGIN
    -- Add customer_auth_method column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'network_devices' AND column_name = 'customer_auth_method') THEN
        ALTER TABLE network_devices ADD COLUMN customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
        RAISE NOTICE 'Added customer_auth_method column to network_devices';
    END IF;
    
    RAISE NOTICE 'Network devices table migration completed';
END $$;

-- Final verification
DO $$
DECLARE
    cs_column_count INTEGER;
    nd_has_auth BOOLEAN;
BEGIN
    -- Count customer_services columns
    SELECT COUNT(*) INTO cs_column_count
    FROM information_schema.columns
    WHERE table_name = 'customer_services';
    
    -- Check if network_devices has customer_auth_method
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'network_devices' AND column_name = 'customer_auth_method'
    ) INTO nd_has_auth;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - customer_services now has % columns', cs_column_count;
    RAISE NOTICE '  - network_devices has customer_auth_method: %', nd_has_auth;
    RAISE NOTICE 'All missing columns added successfully!';
END $$;
