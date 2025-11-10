-- Create routers table (enhanced from existing structure)
CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('mikrotik', 'ubiquiti', 'cisco', 'other')),
    model VARCHAR(255),
    serial VARCHAR(255),
    ip_address VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 8728,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Will be encrypted
    connection_method VARCHAR(50) NOT NULL CHECK (connection_method IN ('public_ip', 'private_ip', 'openvpn')),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create router_services table
CREATE TABLE IF NOT EXISTS router_services (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('pppoe', 'dhcp', 'hotspot', 'static_ip', 'radius')),
    configuration JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update subnets table to include router_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subnets' AND column_name = 'router_id') THEN
        ALTER TABLE subnets ADD COLUMN router_id INTEGER REFERENCES routers(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routers_location_id ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_router_services_router_id ON router_services(router_id);
CREATE INDEX IF NOT EXISTS idx_subnets_router_id ON subnets(router_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for routers table
DROP TRIGGER IF EXISTS update_routers_updated_at ON routers;
CREATE TRIGGER update_routers_updated_at
    BEFORE UPDATE ON routers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO locations (name, address, city, status) 
VALUES 
    ('Main Office', '123 Main St', 'Nairobi', 'active'),
    ('Branch Office', '456 Branch Ave', 'Mombasa', 'active')
ON CONFLICT DO NOTHING;
