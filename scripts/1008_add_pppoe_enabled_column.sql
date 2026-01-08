-- Add pppoe_enabled column to track if PPPoE should be used for this service
-- This is separate from whether credentials exist, as some services may use DHCP or other auth methods

ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false;

-- Update existing services that have PPPoE credentials to mark them as PPPoE enabled
UPDATE customer_services 
SET pppoe_enabled = true 
WHERE pppoe_username IS NOT NULL AND pppoe_username != '';

-- Add index for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_enabled ON customer_services(pppoe_enabled);

-- Add comment
COMMENT ON COLUMN customer_services.pppoe_enabled IS 'Indicates if this service uses PPPoE authentication (vs DHCP/Static)';
