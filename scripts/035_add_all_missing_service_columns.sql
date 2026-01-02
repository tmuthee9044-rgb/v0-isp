-- Add all missing columns to customer_services table for complete service management
-- This enables proper PPPoE authentication, MAC binding, and auto-renewal functionality

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'pppoe';

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);

-- Update existing services to have connection_type
UPDATE customer_services SET connection_type = 'pppoe' WHERE connection_type IS NULL;

COMMENT ON COLUMN customer_services.pppoe_username IS 'PPPoE username for RADIUS authentication';
COMMENT ON COLUMN customer_services.pppoe_password IS 'PPPoE password for RADIUS authentication';
COMMENT ON COLUMN customer_services.mac_address IS 'Customer device MAC address for binding';
COMMENT ON COLUMN customer_services.lock_to_mac IS 'Whether service is locked to specific MAC address';
COMMENT ON COLUMN customer_services.auto_renew IS 'Whether service auto-renews on expiry';
COMMENT ON COLUMN customer_services.connection_type IS 'Connection type: pppoe, static, dhcp, hotspot';
