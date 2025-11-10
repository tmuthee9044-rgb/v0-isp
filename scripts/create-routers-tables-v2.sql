-- Create routers table
CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- mikrotik, cisco, ubiquiti, etc.
    model VARCHAR(255),
    serial VARCHAR(255),
    ip_address INET NOT NULL UNIQUE,
    port INTEGER DEFAULT 8728,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    connection_method VARCHAR(50) DEFAULT 'public_ip', -- public_ip, vpn, local
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance
    last_seen TIMESTAMP,
    firmware_version VARCHAR(100),
    uptime BIGINT,
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    temperature NUMERIC(5,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create router_services table to track what services each router provides
CREATE TABLE IF NOT EXISTS router_services (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL, -- pppoe, dhcp, hotspot, vpn, radius
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(router_id, service_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routers_location_id ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_routers_ip_address ON routers(ip_address);
CREATE INDEX IF NOT EXISTS idx_router_services_router_id ON router_services(router_id);
CREATE INDEX IF NOT EXISTS idx_router_services_service_type ON router_services(service_type);

-- Insert some sample routers for testing
INSERT INTO routers (location_id, name, type, model, ip_address, username, password, connection_method, status) VALUES
(1, 'Main Router - HQ', 'mikrotik', 'RB4011iGS+', '192.168.1.1', 'admin', 'admin123', 'local', 'active'),
(1, 'Branch Router - Downtown', 'mikrotik', 'hEX S', '10.0.1.1', 'admin', 'admin123', 'vpn', 'active'),
(2, 'Tower Router - North', 'ubiquiti', 'EdgeRouter X', '172.16.1.1', 'ubnt', 'ubnt123', 'public_ip', 'active')
ON CONFLICT (ip_address) DO NOTHING;

-- Insert sample router services
INSERT INTO router_services (router_id, service_type, is_enabled) VALUES
(1, 'pppoe', true),
(1, 'dhcp', true),
(1, 'hotspot', false),
(2, 'pppoe', true),
(2, 'dhcp', true),
(3, 'pppoe', true),
(3, 'hotspot', true)
ON CONFLICT (router_id, service_type) DO NOTHING;

-- Update existing customer_services to reference router_id if not already set
-- This assumes router_id 1 for existing services without a router assigned
UPDATE customer_services 
SET router_id = 1 
WHERE router_id IS NULL;

-- Update existing subnets to reference router_id if not already set
UPDATE subnets 
SET router_id = 1 
WHERE router_id IS NULL;

-- Update existing ip_pools to reference router_id if not already set
UPDATE ip_pools 
SET router_id = 1 
WHERE router_id IS NULL;
