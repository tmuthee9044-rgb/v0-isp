-- Run this SQL script DIRECTLY on your offline PostgreSQL database
-- This adds the 6 missing columns to your existing 28-column customer_services table

-- Add mac_address column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);

-- Add pppoe_username column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);

-- Add pppoe_password column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);

-- Add lock_to_mac column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;

-- Add auto_renew column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- Add location_id column
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add foreign key constraint for location_id
ALTER TABLE customer_services
ADD CONSTRAINT fk_customer_services_location
FOREIGN KEY (location_id) REFERENCES locations(id)
ON DELETE SET NULL;

-- Add customer_auth_method to network_devices
ALTER TABLE network_devices
ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_customer_auth_method ON network_devices(customer_auth_method);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_services'
AND column_name IN ('mac_address', 'pppoe_username', 'pppoe_password', 'lock_to_mac', 'auto_renew', 'location_id')
ORDER BY ordinal_position;
