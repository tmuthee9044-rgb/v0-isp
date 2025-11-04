-- Create tables for network management and service activation
CREATE TABLE IF NOT EXISTS ip_pools (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    subnet_mask VARCHAR(15) DEFAULT '255.255.255.0',
    gateway INET,
    status VARCHAR(20) DEFAULT 'available', -- available, allocated, reserved
    allocated_at TIMESTAMP,
    customer_id INTEGER REFERENCES customers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bandwidth_configs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES network_devices(id),
    download_limit INTEGER NOT NULL, -- in Mbps
    upload_limit INTEGER NOT NULL, -- in Mbps
    qos_policy VARCHAR(50) DEFAULT 'standard',
    burst_limit INTEGER,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS network_configurations (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES network_devices(id),
    ip_address INET NOT NULL,
    gateway INET,
    dns1 INET,
    dns2 INET,
    pppoe_enabled BOOLEAN DEFAULT FALSE,
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    bandwidth_config JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, deployed, failed
    deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_activation_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    service_id INTEGER REFERENCES customer_services(id),
    action VARCHAR(50) NOT NULL, -- activate, suspend, terminate, modify
    status VARCHAR(20) NOT NULL, -- success, failed, pending
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing tables
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS device_id INTEGER REFERENCES network_devices(id);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS config_id INTEGER REFERENCES network_configurations(id);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);

-- Insert sample IP pool data
INSERT INTO ip_pools (ip_address, gateway, status) VALUES
('192.168.100.10', '192.168.100.1', 'available'),
('192.168.100.11', '192.168.100.1', 'available'),
('192.168.100.12', '192.168.100.1', 'available'),
('192.168.100.13', '192.168.100.1', 'available'),
('192.168.100.14', '192.168.100.1', 'available'),
('192.168.100.15', '192.168.100.1', 'available'),
('192.168.100.16', '192.168.100.1', 'available'),
('192.168.100.17', '192.168.100.1', 'available'),
('192.168.100.18', '192.168.100.1', 'available'),
('192.168.100.19', '192.168.100.1', 'available')
ON CONFLICT (ip_address) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ip_pools_status ON ip_pools(status);
CREATE INDEX IF NOT EXISTS idx_bandwidth_configs_device ON bandwidth_configs(device_id);
CREATE INDEX IF NOT EXISTS idx_network_configs_device ON network_configurations(device_id);
CREATE INDEX IF NOT EXISTS idx_activation_logs_service ON service_activation_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip ON customer_services(ip_address);
