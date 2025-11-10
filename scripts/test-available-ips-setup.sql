-- Test script to verify available IPs API functionality
-- This script creates test data and verifies the query works correctly

-- First, ensure we have the required tables and test data
DO $$
BEGIN
    -- Create a test router if it doesn't exist
    INSERT INTO network_devices (name, type, ip_address, location, status, gps_coordinates)
    VALUES ('Test Router 1', 'router', '192.168.1.1', 'Test City, Test State', 'online', '40.7128,-74.0060')
    ON CONFLICT (ip_address) DO NOTHING;

    -- Create a test subnet linked to the router
    INSERT INTO ip_subnets (subnet, router_id, description, status)
    SELECT '192.168.100.0/24', nd.id, 'Test Subnet for Available IPs', 'active'
    FROM network_devices nd 
    WHERE nd.name = 'Test Router 1' AND nd.type = 'router'
    ON CONFLICT (subnet) DO NOTHING;

    -- Create test IP addresses in the subnet
    INSERT INTO ip_addresses (ip_address, subnet_id, subnet_mask, gateway, status)
    SELECT 
        '192.168.100.' || generate_series(10, 20),
        s.id,
        '255.255.255.0',
        '192.168.100.1',
        'available'
    FROM ip_subnets s
    WHERE s.subnet = '192.168.100.0/24'
    ON CONFLICT (ip_address) DO NOTHING;

    -- Create a test customer if needed
    INSERT INTO customers (first_name, last_name, email, phone, address, city, state, gps_coordinates, status)
    VALUES ('Test', 'Customer', 'test@example.com', '555-0123', '123 Test St', 'Test City', 'Test State', '40.7589,-73.9851', 'active')
    ON CONFLICT (email) DO NOTHING;

END $$;

-- Test the query that the API uses
SELECT DISTINCT
    ia.id,
    ia.ip_address,
    ia.subnet_mask,
    ia.gateway,
    ia.status,
    nd.id as router_id,
    nd.name as router_name,
    nd.location as router_location,
    nd.ip_address as router_ip,
    nd.status as router_status
FROM ip_addresses ia
JOIN ip_subnets s ON ia.subnet_id = s.id
JOIN network_devices nd ON s.router_id = nd.id
WHERE ia.status = 'available'
    AND nd.status = 'online'
    AND nd.type = 'router'
ORDER BY ia.ip_address ASC
LIMIT 10;

-- Verify the data was created correctly
SELECT 'Network Devices' as table_name, COUNT(*) as count FROM network_devices WHERE type = 'router'
UNION ALL
SELECT 'IP Subnets' as table_name, COUNT(*) as count FROM ip_subnets
UNION ALL
SELECT 'IP Addresses' as table_name, COUNT(*) as count FROM ip_addresses WHERE status = 'available'
UNION ALL
SELECT 'Customers' as table_name, COUNT(*) as count FROM customers WHERE email = 'test@example.com';
