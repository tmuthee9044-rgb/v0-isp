-- Add router_id column to ip_pools table if it doesn't exist
ALTER TABLE ip_pools 
ADD COLUMN IF NOT EXISTS router_id INTEGER;

-- Add location_id column to customers table if it doesn't exist  
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add location_id column to network_devices (routers) table if it doesn't exist
ALTER TABLE network_devices 
ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Create foreign key relationships
-- Link ip_pools to routers (network_devices)
ALTER TABLE ip_pools 
ADD CONSTRAINT fk_ip_pools_router 
FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;

-- Link customers to locations
ALTER TABLE customers 
ADD CONSTRAINT fk_customers_location 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Link routers (network_devices) to locations
ALTER TABLE network_devices 
ADD CONSTRAINT fk_network_devices_location 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Link subnets to routers (already exists in schema)
-- ALTER TABLE subnets 
-- ADD CONSTRAINT fk_subnets_router 
-- FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ip_pools_router_id ON ip_pools(router_id);
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_location_id ON network_devices(location_id);
CREATE INDEX IF NOT EXISTS idx_subnets_router_id ON subnets(router_id);

-- Insert some sample locations if they don't exist
INSERT INTO locations (name, description, address, city, region, status) 
VALUES 
  ('Downtown Office', 'Main downtown location', '123 Main St', 'City Center', 'Central', 'active'),
  ('North Branch', 'Northern area coverage', '456 North Ave', 'North District', 'North', 'active'),
  ('South Hub', 'Southern region hub', '789 South Blvd', 'South District', 'South', 'active')
ON CONFLICT DO NOTHING;

-- Insert sample routers for each location
INSERT INTO network_devices (name, type, ip_address, mac_address, location, status, location_id, configuration)
VALUES 
  ('Router-Downtown-01', 'router', '192.168.1.1', '00:11:22:33:44:55', 'Downtown Office', 'active', 
   (SELECT id FROM locations WHERE name = 'Downtown Office' LIMIT 1),
   '{"model": "Mikrotik RB4011", "firmware": "7.10.1"}'::jsonb),
  ('Router-North-01', 'router', '192.168.2.1', '00:11:22:33:44:56', 'North Branch', 'active',
   (SELECT id FROM locations WHERE name = 'North Branch' LIMIT 1),
   '{"model": "Mikrotik RB4011", "firmware": "7.10.1"}'::jsonb),
  ('Router-South-01', 'router', '192.168.3.1', '00:11:22:33:44:57', 'South Hub', 'active',
   (SELECT id FROM locations WHERE name = 'South Hub' LIMIT 1),
   '{"model": "Mikrotik RB4011", "firmware": "7.10.1"}'::jsonb)
ON CONFLICT DO NOTHING;
