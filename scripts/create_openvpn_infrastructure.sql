-- ========================================
-- OpenVPN Infrastructure for Trust Waves ISP
-- Purpose: Allow routers behind NAT/CGNAT to connect securely via OpenVPN
-- ========================================

-- 1. VPN Certificates Table (PKI Management)
CREATE TABLE IF NOT EXISTS vpn_certificates (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('ca', 'server', 'client')),
    common_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    certificate_pem TEXT NOT NULL,
    private_key_pem TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Router VPN Profiles Table (Connection Details)
CREATE TABLE IF NOT EXISTS router_vpn_profiles (
    id SERIAL PRIMARY KEY,
    router_id INTEGER UNIQUE REFERENCES network_devices(id) ON DELETE CASCADE,
    vpn_ip VARCHAR(50) UNIQUE, -- e.g., 10.200.0.2
    vpn_subnet VARCHAR(50) DEFAULT '10.200.0.0/16', -- Management subnet
    certificate_id INTEGER REFERENCES vpn_certificates(id) ON DELETE SET NULL,
    config_generated_at TIMESTAMP,
    config_downloaded_at TIMESTAMP,
    first_connected_at TIMESTAMP,
    last_connected_at TIMESTAMP,
    connection_status VARCHAR(50) DEFAULT 'pending' CHECK (connection_status IN ('pending', 'connected', 'disconnected', 'error')),
    public_ip VARCHAR(50), -- Router's public IP (for NAT traversal tracking)
    vpn_port INTEGER DEFAULT 1194,
    vpn_protocol VARCHAR(10) DEFAULT 'udp' CHECK (vpn_protocol IN ('udp', 'tcp')),
    compression BOOLEAN DEFAULT true,
    cipher VARCHAR(50) DEFAULT 'AES-256-GCM',
    auth_algorithm VARCHAR(50) DEFAULT 'SHA256',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. VPN Sessions Table (Active Connections)
CREATE TABLE IF NOT EXISTS vpn_sessions (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    vpn_profile_id INTEGER REFERENCES router_vpn_profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    vpn_ip VARCHAR(50),
    public_ip VARCHAR(50),
    public_port INTEGER,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    connection_duration INTEGER, -- seconds
    disconnect_reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'timeout')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. VPN Certificate Revocation List
CREATE TABLE IF NOT EXISTS vpn_revocations (
    id SERIAL PRIMARY KEY,
    certificate_id INTEGER REFERENCES vpn_certificates(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_by INTEGER, -- admin user_id
    reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. VPN Server Configuration Table
CREATE TABLE IF NOT EXISTS vpn_server_config (
    id SERIAL PRIMARY KEY,
    server_name VARCHAR(255) NOT NULL,
    server_ip VARCHAR(50) NOT NULL,
    server_port INTEGER DEFAULT 1194,
    protocol VARCHAR(10) DEFAULT 'udp' CHECK (protocol IN ('udp', 'tcp')),
    vpn_subnet VARCHAR(50) DEFAULT '10.200.0.0/16',
    dns_servers TEXT, -- Comma-separated DNS IPs
    push_routes TEXT, -- Comma-separated routes to push
    max_clients INTEGER DEFAULT 10000,
    keepalive_ping INTEGER DEFAULT 10,
    keepalive_timeout INTEGER DEFAULT 120,
    cipher VARCHAR(50) DEFAULT 'AES-256-GCM',
    auth_algorithm VARCHAR(50) DEFAULT 'SHA256',
    tls_auth_enabled BOOLEAN DEFAULT true,
    compression BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    ca_certificate_id INTEGER REFERENCES vpn_certificates(id) ON DELETE SET NULL,
    server_certificate_id INTEGER REFERENCES vpn_certificates(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (queries under 5ms per rule 6)
CREATE INDEX IF NOT EXISTS idx_vpn_certificates_router_id ON vpn_certificates(router_id);
CREATE INDEX IF NOT EXISTS idx_vpn_certificates_status ON vpn_certificates(status);
CREATE INDEX IF NOT EXISTS idx_vpn_certificates_expires_at ON vpn_certificates(expires_at);

CREATE INDEX IF NOT EXISTS idx_router_vpn_profiles_router_id ON router_vpn_profiles(router_id);
CREATE INDEX IF NOT EXISTS idx_router_vpn_profiles_vpn_ip ON router_vpn_profiles(vpn_ip);
CREATE INDEX IF NOT EXISTS idx_router_vpn_profiles_status ON router_vpn_profiles(connection_status);

CREATE INDEX IF NOT EXISTS idx_vpn_sessions_router_id ON vpn_sessions(router_id);
CREATE INDEX IF NOT EXISTS idx_vpn_sessions_status ON vpn_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vpn_sessions_connected_at ON vpn_sessions(connected_at DESC);
CREATE INDEX IF NOT EXISTS idx_vpn_sessions_session_id ON vpn_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_vpn_revocations_certificate_id ON vpn_revocations(certificate_id);
CREATE INDEX IF NOT EXISTS idx_vpn_revocations_serial_number ON vpn_revocations(serial_number);

-- Add VPN-related columns to network_devices if they don't exist
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS vpn_enabled BOOLEAN DEFAULT false;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS vpn_connection_method VARCHAR(50) DEFAULT 'direct' CHECK (vpn_connection_method IN ('direct', 'openvpn', 'wireguard'));
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS behind_nat BOOLEAN DEFAULT false;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS vpn_last_seen TIMESTAMP;

-- Insert default VPN server config
INSERT INTO vpn_server_config (
    server_name, server_ip, server_port, protocol, vpn_subnet, 
    dns_servers, push_routes, max_clients, cipher, tls_auth_enabled
) VALUES (
    'Trust Waves VPN Server', 
    '0.0.0.0', -- Replace with actual server IP
    1194, 
    'udp', 
    '10.200.0.0/16',
    '8.8.8.8,8.8.4.4',
    '192.168.0.0/16,172.16.0.0/12',
    10000,
    'AES-256-GCM',
    true
) ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE vpn_certificates IS 'PKI certificates for OpenVPN authentication (CA, server, and client certificates)';
COMMENT ON TABLE router_vpn_profiles IS 'VPN connection profiles for each router, including VPN IP assignment and configuration';
COMMENT ON TABLE vpn_sessions IS 'Active and historical VPN sessions for connection tracking and monitoring';
COMMENT ON TABLE vpn_revocations IS 'Certificate Revocation List (CRL) for security management';
COMMENT ON TABLE vpn_server_config IS 'OpenVPN server configuration and settings';
