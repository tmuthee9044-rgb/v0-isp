-- Add RADIUS-related columns to network_devices table

ALTER TABLE network_devices
ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS nas_ip_address INET,
ADD COLUMN IF NOT EXISTS nas_identifier VARCHAR(255),
ADD COLUMN IF NOT EXISTS radius_enabled BOOLEAN DEFAULT TRUE;

-- Create an index for faster RADIUS lookups
CREATE INDEX IF NOT EXISTS idx_network_devices_radius_enabled ON network_devices(radius_enabled) WHERE radius_enabled = TRUE;

-- Add comment explaining the columns
COMMENT ON COLUMN network_devices.radius_secret IS 'Shared secret for RADIUS authentication with this device';
COMMENT ON COLUMN network_devices.nas_ip_address IS 'NAS IP address used for RADIUS (defaults to ip_address if not set)';
COMMENT ON COLUMN network_devices.nas_identifier IS 'Unique identifier for this NAS in RADIUS';
COMMENT ON COLUMN network_devices.radius_enabled IS 'Whether this device should be registered in RADIUS';

-- Function to automatically sync routers to RADIUS nas table
CREATE OR REPLACE FUNCTION sync_router_to_nas()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process routers with RADIUS enabled
    IF NEW.device_type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') 
       AND (NEW.device_type ILIKE '%router%' OR NEW.radius_enabled = TRUE) THEN
        
        -- Use nas_ip_address if set, otherwise use ip_address
        DECLARE
            v_nas_ip INET := COALESCE(NEW.nas_ip_address, NEW.ip_address);
            v_nas_name VARCHAR(255) := COALESCE(NEW.nas_identifier, NEW.name);
            v_secret VARCHAR(255) := COALESCE(NEW.radius_secret, 'testing123');
        BEGIN
            -- Insert or update in nas table
            INSERT INTO nas (nasname, shortname, type, ports, secret, server, community, description)
            VALUES (
                v_nas_ip::text,
                v_nas_name,
                'other',
                1812,
                v_secret,
                NULL,
                NULL,
                'Auto-synced from network_devices: ' || NEW.name
            )
            ON CONFLICT (nasname) DO UPDATE SET
                shortname = EXCLUDED.shortname,
                secret = EXCLUDED.secret,
                description = EXCLUDED.description;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync routers to nas table
DROP TRIGGER IF EXISTS trigger_sync_router_to_nas ON network_devices;
CREATE TRIGGER trigger_sync_router_to_nas
    AFTER INSERT OR UPDATE OF ip_address, nas_ip_address, radius_secret, radius_enabled, device_type
    ON network_devices
    FOR EACH ROW
    EXECUTE FUNCTION sync_router_to_nas();

-- Initial sync of existing routers to nas table
INSERT INTO nas (nasname, shortname, type, ports, secret, server, community, description)
SELECT 
    COALESCE(nas_ip_address, ip_address)::text as nasname,
    COALESCE(nas_identifier, name) as shortname,
    'other' as type,
    1812 as ports,
    COALESCE(radius_secret, 'testing123') as secret,
    NULL as server,
    NULL as community,
    'Auto-synced from network_devices: ' || name as description
FROM network_devices
WHERE (device_type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') 
       OR device_type ILIKE '%router%')
  AND ip_address IS NOT NULL
  AND COALESCE(radius_enabled, TRUE) = TRUE
ON CONFLICT (nasname) DO UPDATE SET
    shortname = EXCLUDED.shortname,
    secret = EXCLUDED.secret,
    description = EXCLUDED.description;

RAISE NOTICE 'RADIUS columns added and auto-sync trigger created successfully';
