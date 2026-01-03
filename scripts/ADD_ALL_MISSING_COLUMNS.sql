-- ============================================================
-- CRITICAL: Add ALL missing columns to customer_services table
-- Run this with: psql $DATABASE_URL -f scripts/ADD_ALL_MISSING_COLUMNS.sql
-- ============================================================

-- Add connection_type column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='connection_type') THEN
        ALTER TABLE customer_services ADD COLUMN connection_type VARCHAR(50) DEFAULT 'pppoe';
        RAISE NOTICE 'Added connection_type column';
    ELSE
        RAISE NOTICE 'connection_type column already exists';
    END IF;
END $$;

-- Add ip_address column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='ip_address') THEN
        ALTER TABLE customer_services ADD COLUMN ip_address VARCHAR(45);
        RAISE NOTICE 'Added ip_address column';
    ELSE
        RAISE NOTICE 'ip_address column already exists';
    END IF;
END $$;

-- Add mac_address column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='mac_address') THEN
        ALTER TABLE customer_services ADD COLUMN mac_address VARCHAR(17);
        RAISE NOTICE 'Added mac_address column';
    ELSE
        RAISE NOTICE 'mac_address column already exists';
    END IF;
END $$;

-- Add device_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='device_id') THEN
        ALTER TABLE customer_services ADD COLUMN device_id INTEGER;
        RAISE NOTICE 'Added device_id column';
    ELSE
        RAISE NOTICE 'device_id column already exists';
    END IF;
END $$;

-- Add lock_to_mac column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='lock_to_mac') THEN
        ALTER TABLE customer_services ADD COLUMN lock_to_mac BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added lock_to_mac column';
    ELSE
        RAISE NOTICE 'lock_to_mac column already exists';
    END IF;
END $$;

-- Add auto_renew column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='auto_renew') THEN
        ALTER TABLE customer_services ADD COLUMN auto_renew BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_renew column';
    ELSE
        RAISE NOTICE 'auto_renew column already exists';
    END IF;
END $$;

-- Add pppoe_username column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='pppoe_username') THEN
        ALTER TABLE customer_services ADD COLUMN pppoe_username VARCHAR(100);
        RAISE NOTICE 'Added pppoe_username column';
    ELSE
        RAISE NOTICE 'pppoe_username column already exists';
    END IF;
END $$;

-- Add pppoe_password column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='pppoe_password') THEN
        ALTER TABLE customer_services ADD COLUMN pppoe_password VARCHAR(100);
        RAISE NOTICE 'Added pppoe_password column';
    ELSE
        RAISE NOTICE 'pppoe_password column already exists';
    END IF;
END $$;

-- Add location_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_services' AND column_name='location_id') THEN
        ALTER TABLE customer_services ADD COLUMN location_id INTEGER;
        RAISE NOTICE 'Added location_id column';
    ELSE
        RAISE NOTICE 'location_id column already exists';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_device_id ON customer_services(device_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customer_services'
ORDER BY ordinal_position;

RAISE NOTICE '✅ All columns added successfully to customer_services table';
