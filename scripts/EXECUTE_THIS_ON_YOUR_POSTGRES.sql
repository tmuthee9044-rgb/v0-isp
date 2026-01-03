-- Run this SQL directly on your OFFLINE PostgreSQL database
-- Use: psql -U your_username -d your_database -f scripts/EXECUTE_THIS_ON_YOUR_POSTGRES.sql

-- Add all missing columns to customer_services table
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe',
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
ADD COLUMN IF NOT EXISTS device_id INTEGER,
ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add customer_auth_method to network_devices table
ALTER TABLE network_devices 
ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_device_id ON customer_services(device_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_services' 
  AND column_name IN ('connection_type', 'ip_address', 'mac_address', 'device_id', 'lock_to_mac', 'auto_renew', 'pppoe_username', 'pppoe_password', 'location_id')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'network_devices' 
  AND column_name = 'customer_auth_method';
