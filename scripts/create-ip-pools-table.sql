-- Create IP pools table for managing IP address assignments
CREATE TABLE IF NOT EXISTS ip_pools (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    gateway INET,
    subnet_mask INET,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'reserved', 'blocked')),
    assigned_to INTEGER REFERENCES customers(id),
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_pools_status ON ip_pools(status);
CREATE INDEX IF NOT EXISTS idx_ip_pools_assigned_to ON ip_pools(assigned_to);

-- Insert sample IP pool data
INSERT INTO ip_pools (ip_address, gateway, subnet_mask, status) VALUES
('192.168.1.10', '192.168.1.1', '255.255.255.0', 'available'),
('192.168.1.11', '192.168.1.1', '255.255.255.0', 'available'),
('192.168.1.12', '192.168.1.1', '255.255.255.0', 'available'),
('192.168.1.13', '192.168.1.1', '255.255.255.0', 'available'),
('192.168.1.14', '192.168.1.1', '255.255.255.0', 'available'),
('10.0.1.10', '10.0.1.1', '255.255.255.0', 'available'),
('10.0.1.11', '10.0.1.1', '255.255.255.0', 'available'),
('10.0.1.12', '10.0.1.1', '255.255.255.0', 'available'),
('172.16.1.10', '172.16.1.1', '255.255.255.0', 'available'),
('172.16.1.11', '172.16.1.1', '255.255.255.0', 'available')
ON CONFLICT (ip_address) DO NOTHING;
