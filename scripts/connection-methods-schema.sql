-- Create connection methods table
CREATE TABLE IF NOT EXISTS connection_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('public_ip', 'openvpn', 'pptp', 'l2tp', 'wireguard')),
  description TEXT,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create OpenVPN configurations table
CREATE TABLE IF NOT EXISTS openvpn_configs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
  config_content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Add connection method to customer services
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS connection_method_id INTEGER REFERENCES connection_methods(id),
ADD COLUMN IF NOT EXISTS connection_method VARCHAR(50);

-- Add subnet type for public/private IP classification
ALTER TABLE subnets 
ADD COLUMN IF NOT EXISTS subnet_type VARCHAR(20) DEFAULT 'private' CHECK (subnet_type IN ('public', 'private'));

-- Insert default connection methods
INSERT INTO connection_methods (name, type, description, config) VALUES
('Public IP Direct', 'public_ip', 'Direct connection with public IP address', '{"nat": false, "firewall": "basic"}'),
('OpenVPN Tunnel', 'openvpn', 'Secure VPN tunnel connection', '{"port": 1194, "protocol": "udp", "cipher": "AES-256-CBC"}'),
('Private IP NAT', 'public_ip', 'Private IP with NAT gateway', '{"nat": true, "firewall": "strict"}')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_openvpn_configs_customer ON openvpn_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_openvpn_configs_router ON openvpn_configs(router_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_connection ON customer_services(connection_method_id);
CREATE INDEX IF NOT EXISTS idx_subnets_type ON subnets(subnet_type);
