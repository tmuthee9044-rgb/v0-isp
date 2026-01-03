-- Add missing columns to customer_services table
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100),
ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);

-- Add foreign key constraint for location_id
ALTER TABLE customer_services
ADD CONSTRAINT fk_customer_services_location
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Add customer_auth_method column to network_devices table  
ALTER TABLE network_devices
ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Add index for router auth method
CREATE INDEX IF NOT EXISTS idx_network_devices_auth_method ON network_devices(customer_auth_method);
