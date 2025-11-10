-- Add location_id to customers table if not exists
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Add location_id to network_devices (routers) table if not exists  
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Add router_id to ip_pools table if not exists
ALTER TABLE ip_pools ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES network_devices(id);

-- Update subnets table to ensure router_id relationship exists (it already exists)
-- ALTER TABLE subnets ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES network_devices(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_location_id ON network_devices(location_id);
CREATE INDEX IF NOT EXISTS idx_ip_pools_router_id ON ip_pools(router_id);
CREATE INDEX IF NOT EXISTS idx_subnets_router_id ON subnets(router_id);

-- Insert some sample locations if they don't exist
INSERT INTO locations (name, description, address, city, region, status, created_at, updated_at)
VALUES 
    ('Downtown Office', 'Main office location in downtown area', '123 Main St', 'Nairobi', 'Central', 'active', NOW(), NOW()),
    ('Westlands Branch', 'Branch office in Westlands area', '456 Westlands Ave', 'Nairobi', 'Central', 'active', NOW(), NOW()),
    ('Eastlands Hub', 'Service hub in Eastlands area', '789 Eastlands Rd', 'Nairobi', 'Central', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert sample routers for each location
INSERT INTO network_devices (name, type, ip_address, mac_address, location, status, location_id, created_at)
VALUES 
    ('Router-Downtown-01', 'router', '192.168.1.1', '00:11:22:33:44:55', 'Downtown Office', 'active', 1, NOW()),
    ('Router-Westlands-01', 'router', '192.168.2.1', '00:11:22:33:44:56', 'Westlands Branch', 'active', 2, NOW()),
    ('Router-Eastlands-01', 'router', '192.168.3.1', '00:11:22:33:44:57', 'Eastlands Hub', 'active', 3, NOW())
ON CONFLICT DO NOTHING;

-- Update existing customers to have location assignments (randomly distribute for demo)
UPDATE customers 
SET location_id = (
    CASE 
        WHEN id % 3 = 1 THEN 1
        WHEN id % 3 = 2 THEN 2
        ELSE 3
    END
)
WHERE location_id IS NULL;

-- Update existing subnets to be assigned to routers
UPDATE subnets 
SET router_id = (
    CASE 
        WHEN id % 3 = 1 THEN (SELECT id FROM network_devices WHERE name = 'Router-Downtown-01' LIMIT 1)
        WHEN id % 3 = 2 THEN (SELECT id FROM network_devices WHERE name = 'Router-Westlands-01' LIMIT 1)
        ELSE (SELECT id FROM network_devices WHERE name = 'Router-Eastlands-01' LIMIT 1)
    END
)
WHERE router_id IS NULL;

-- Update existing IP pools to be assigned to routers based on their subnet
UPDATE ip_pools 
SET router_id = s.router_id
FROM subnets s
WHERE ip_pools.router_id IS NULL 
AND s.network >>= ip_pools.ip_address;
