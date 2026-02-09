-- Migration: Add all missing columns to customer_services table for service provisioning
-- This script is idempotent and safe to run multiple times

-- Add all the columns used by addCustomerService function
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_id BIGINT;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'pppoe';
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(50) DEFAULT 'radius';
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id BIGINT;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_sync_status VARCHAR(50);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_router_id ON customer_services(router_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_auth_method ON customer_services(auth_method);

-- Add foreign key constraint for router_id if network_devices table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'network_devices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_customer_services_router' 
            AND table_name = 'customer_services'
        ) THEN
            ALTER TABLE customer_services 
            ADD CONSTRAINT fk_customer_services_router 
            FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key constraint for location_id if locations table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_customer_services_location' 
            AND table_name = 'customer_services'
        ) THEN
            ALTER TABLE customer_services 
            ADD CONSTRAINT fk_customer_services_location 
            FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_services_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_services_updated_at ON customer_services;
CREATE TRIGGER trigger_customer_services_updated_at
    BEFORE UPDATE ON customer_services
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_services_timestamp();

-- Success message
SELECT 'Migration completed: All customer_services columns added' as status;
