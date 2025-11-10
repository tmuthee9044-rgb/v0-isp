-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    town VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add location_id to routers table (assuming routers table exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routers' AND column_name = 'location_id') THEN
        ALTER TABLE routers ADD COLUMN location_id UUID REFERENCES locations(id);
    END IF;
END $$;

-- Create ip_subnets table
CREATE TABLE IF NOT EXISTS ip_subnets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    router_id UUID REFERENCES routers(id) ON DELETE CASCADE,
    subnet_cidr VARCHAR(50) NOT NULL, -- e.g., "192.168.1.0/24"
    gateway VARCHAR(45) NOT NULL, -- e.g., "192.168.1.1"
    dns_primary VARCHAR(45),
    dns_secondary VARCHAR(45),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ip_allocations table
CREATE TABLE IF NOT EXISTS ip_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subnet_id UUID REFERENCES ip_subnets(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'reserved')),
    customer_service_id UUID,
    allocated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address, subnet_id)
);

-- Create tariffs table
CREATE TABLE IF NOT EXISTS tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    monthly_fee DECIMAL(10,2) NOT NULL,
    bandwidth_up INTEGER, -- in Mbps
    bandwidth_down INTEGER, -- in Mbps
    data_limit INTEGER, -- in GB, NULL for unlimited
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update customer_services table to include new relationships
DO $$ 
BEGIN
    -- Add location_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'location_id') THEN
        ALTER TABLE customer_services ADD COLUMN location_id UUID REFERENCES locations(id);
    END IF;
    
    -- Add router_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'router_id') THEN
        ALTER TABLE customer_services ADD COLUMN router_id UUID REFERENCES routers(id);
    END IF;
    
    -- Add ip_allocation_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'ip_allocation_id') THEN
        ALTER TABLE customer_services ADD COLUMN ip_allocation_id UUID REFERENCES ip_allocations(id);
    END IF;
    
    -- Add inventory_item_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'inventory_item_id') THEN
        ALTER TABLE customer_services ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id);
    END IF;
    
    -- Add tariff_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'tariff_id') THEN
        ALTER TABLE customer_services ADD COLUMN tariff_id UUID REFERENCES tariffs(id);
    END IF;
END $$;

-- Create routers table if it doesn't exist
CREATE TABLE IF NOT EXISTS routers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    location_id UUID REFERENCES locations(id),
    model VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO locations (name, town, status) VALUES 
('Main Office', 'Nairobi', 'active'),
('Branch Office', 'Mombasa', 'active'),
('Remote Site', 'Kisumu', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO tariffs (name, description, monthly_fee, bandwidth_up, bandwidth_down, data_limit) VALUES 
('Basic Plan', '10 Mbps unlimited', 2500.00, 10, 10, NULL),
('Premium Plan', '50 Mbps unlimited', 5000.00, 50, 50, NULL),
('Enterprise Plan', '100 Mbps unlimited', 10000.00, 100, 100, NULL)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_routers_location_id ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_ip_subnets_router_id ON ip_subnets(router_id);
CREATE INDEX IF NOT EXISTS idx_ip_allocations_subnet_id ON ip_allocations(subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_allocations_status ON ip_allocations(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_router_id ON customer_services(router_id);
