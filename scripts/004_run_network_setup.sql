-- Execute the network tables setup
-- This script ensures all network management tables are created

-- First, ensure locations table exists (referenced by routers)
INSERT INTO locations (name, city, region, address, status) VALUES
('Main Office', 'Nairobi', 'Central', '123 Main Street, Nairobi', 'active'),
('Branch Office', 'Mombasa', 'Coast', '456 Branch Road, Mombasa', 'active')
ON CONFLICT DO NOTHING;

-- Now run the network tables creation
-- (The content from 001_create_network_tables.sql will be executed)
