-- Create hotspot management tables
CREATE TABLE IF NOT EXISTS hotspots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    ssid VARCHAR(100) NOT NULL,
    password VARCHAR(255),
    security_type VARCHAR(50) DEFAULT 'WPA2',
    bandwidth_limit INTEGER, -- in Mbps
    user_limit INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'active',
    device_mac VARCHAR(17),
    device_model VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotspot_users (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    time_limit INTEGER, -- in minutes
    data_limit INTEGER, -- in MB
    expiry_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotspot_id, username)
);

CREATE TABLE IF NOT EXISTS hotspot_sessions (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES hotspot_users(id) ON DELETE CASCADE,
    mac_address VARCHAR(17),
    ip_address INET,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    data_used BIGINT DEFAULT 0, -- in bytes
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS hotspot_vouchers (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER REFERENCES hotspots(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    time_limit INTEGER, -- in minutes
    data_limit INTEGER, -- in MB
    max_users INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expiry_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotspots_status ON hotspots(status);
CREATE INDEX IF NOT EXISTS idx_hotspot_users_hotspot_id ON hotspot_users(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_hotspot_id ON hotspot_sessions(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_vouchers_code ON hotspot_vouchers(code);
