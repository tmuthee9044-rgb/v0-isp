-- Network Management Module Database Schema
-- This script creates all necessary tables for the network management functionality

-- Routers table
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('mikrotik', 'ubiquiti', 'juniper', 'other')),
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('public_ip', 'private_ip', 'vpn')),
    hostname VARCHAR(255) NOT NULL,
    api_port INT DEFAULT 8728,
    ssh_port INT DEFAULT 22,
    username VARCHAR(100) NOT NULL,
    password TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- IP Subnets table
CREATE TABLE IF NOT EXISTS ip_subnets (
    id BIGSERIAL PRIMARY KEY,
    router_id BIGINT NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    cidr VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('public', 'private', 'cgnat', 'ipv6')),
    allocation_mode VARCHAR(20) DEFAULT 'dynamic' CHECK (allocation_mode IN ('dynamic', 'static')),
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (router_id, cidr)
);

-- Update existing ip_addresses table to reference new schema
-- First, add new columns if they don't exist
DO $$ 
BEGIN
    -- Add subnet_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_addresses' AND column_name = 'subnet_id') THEN
        ALTER TABLE ip_addresses ADD COLUMN subnet_id BIGINT REFERENCES ip_subnets(id) ON DELETE CASCADE;
    END IF;
    
    -- Add router_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_addresses' AND column_name = 'router_id') THEN
        ALTER TABLE ip_addresses ADD COLUMN router_id BIGINT REFERENCES routers(id) ON DELETE CASCADE;
    END IF;
    
    -- Add assigned_to_customer column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_addresses' AND column_name = 'assigned_to_customer') THEN
        ALTER TABLE ip_addresses ADD COLUMN assigned_to_customer BIGINT REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    
    -- Add assigned_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_addresses' AND column_name = 'assigned_at') THEN
        ALTER TABLE ip_addresses ADD COLUMN assigned_at TIMESTAMP;
    END IF;
    
    -- Add released_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_addresses' AND column_name = 'released_at') THEN
        ALTER TABLE ip_addresses ADD COLUMN released_at TIMESTAMP;
    END IF;
END $$;

-- Update existing customer_services table to reference routers
DO $$ 
BEGIN
    -- Add router_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'router_id') THEN
        ALTER TABLE customer_services ADD COLUMN router_id BIGINT REFERENCES routers(id) ON DELETE CASCADE;
    END IF;
    
    -- Add ip_address_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'ip_address_id') THEN
        ALTER TABLE customer_services ADD COLUMN ip_address_id BIGINT REFERENCES ip_addresses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Router sync status table
CREATE TABLE IF NOT EXISTS router_sync_status (
    id BIGSERIAL PRIMARY KEY,
    router_id BIGINT NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    ip_address_id BIGINT REFERENCES ip_addresses(id) ON DELETE CASCADE,
    customer_service_id BIGINT REFERENCES customer_services(id) ON DELETE CASCADE,
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('in_sync', 'out_of_sync', 'pending')),
    retry_count INT DEFAULT 0,
    last_checked TIMESTAMP DEFAULT NOW(),
    last_synced TIMESTAMP,
    sync_message TEXT
);

-- Update existing router_logs table or create if it doesn't exist
CREATE TABLE IF NOT EXISTS router_logs (
    id BIGSERIAL PRIMARY KEY,
    router_id BIGINT NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routers_location ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_ip_subnets_router ON ip_subnets(router_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet ON ip_addresses(subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_router ON ip_addresses(router_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_router ON customer_services(router_id);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_router ON router_sync_status(router_id);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_sync_status ON router_sync_status(sync_status);
CREATE INDEX IF NOT EXISTS idx_router_logs_router ON router_logs(router_id);
CREATE INDEX IF NOT EXISTS idx_router_logs_created_at ON router_logs(created_at);

-- Insert some sample data for testing
INSERT INTO routers (name, type, location_id, connection_type, hostname, username, password, status) 
VALUES 
    ('Main Office Router', 'mikrotik', 1, 'public_ip', '192.168.1.1', 'admin', 'password123', 'connected'),
    ('Branch Office Router', 'ubiquiti', 1, 'private_ip', '10.0.0.1', 'ubnt', 'ubnt123', 'disconnected')
ON CONFLICT DO NOTHING;

-- Insert sample subnets
INSERT INTO ip_subnets (router_id, cidr, type, allocation_mode, name, description)
VALUES 
    (1, '192.168.100.0/24', 'private', 'dynamic', 'Customer Pool 1', 'Main customer IP pool'),
    (1, '10.10.0.0/24', 'private', 'static', 'Static Pool', 'Static IP assignments'),
    (2, '172.16.0.0/24', 'private', 'dynamic', 'Branch Pool', 'Branch office customer pool')
ON CONFLICT DO NOTHING;

COMMIT;
