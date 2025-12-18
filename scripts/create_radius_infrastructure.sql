-- RADIUS Infrastructure Schema
-- Complete AAA (Authentication, Authorization, Accounting) database structure

-- Drop existing tables if they exist (development only)
DROP TABLE IF EXISTS radius_accounting CASCADE;
DROP TABLE IF EXISTS radius_sessions_archive CASCADE;
DROP TABLE IF EXISTS radius_sessions_active CASCADE;
DROP TABLE IF EXISTS radius_users CASCADE;
DROP TABLE IF EXISTS radius_nas CASCADE;

-- NAS (Network Access Server) - Routers
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Users (linked to customers)
CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'disabled')),
    ip_address INET,
    ip_pool VARCHAR(100),
    download_limit BIGINT, -- in Mbps
    upload_limit BIGINT, -- in Mbps
    session_timeout INTEGER, -- in seconds
    idle_timeout INTEGER, -- in seconds
    simultaneous_use INTEGER DEFAULT 1,
    fup_limit BIGINT, -- data limit in bytes
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Active RADIUS Sessions (hot data)
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL UNIQUE,
    acct_unique_id VARCHAR(255),
    username VARCHAR(255) NOT NULL,
    user_id INTEGER,
    nas_id INTEGER NOT NULL,
    nas_ip_address INET NOT NULL,
    nas_port_id VARCHAR(50),
    service_type VARCHAR(50), -- PPPoE, Hotspot, VPN, Wireless
    framed_ip_address INET,
    framed_ipv6_address INET,
    calling_station_id VARCHAR(50), -- MAC address
    called_station_id VARCHAR(50),
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    last_update TIMESTAMP DEFAULT NOW(),
    session_time INTEGER DEFAULT 0, -- in seconds
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    interim_interval INTEGER DEFAULT 300,
    download_speed BIGINT,
    upload_speed BIGINT,
    FOREIGN KEY (user_id) REFERENCES radius_users(id) ON DELETE SET NULL,
    FOREIGN KEY (nas_id) REFERENCES radius_nas(id) ON DELETE CASCADE
);

-- Archived RADIUS Sessions (cold data)
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL,
    acct_unique_id VARCHAR(255),
    username VARCHAR(255) NOT NULL,
    user_id INTEGER,
    nas_id INTEGER,
    nas_ip_address INET NOT NULL,
    nas_port_id VARCHAR(50),
    service_type VARCHAR(50),
    framed_ip_address INET,
    framed_ipv6_address INET,
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    terminate_cause VARCHAR(50),
    download_speed BIGINT,
    upload_speed BIGINT,
    archived_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Accounting Events (for detailed audit)
CREATE TABLE IF NOT EXISTS radius_accounting (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('Start', 'Interim-Update', 'Stop')),
    event_time TIMESTAMP DEFAULT NOW(),
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    session_time INTEGER DEFAULT 0,
    framed_ip_address INET,
    terminate_cause VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance (rule 6: queries under 5ms)
CREATE INDEX IF NOT EXISTS idx_radius_nas_ip ON radius_nas(ip_address);
CREATE INDEX IF NOT EXISTS idx_radius_nas_status ON radius_nas(status);

CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_users_expiry ON radius_users(expiry_date);

CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_session ON radius_sessions_active(acct_session_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_user ON radius_sessions_active(user_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_nas ON radius_sessions_active(nas_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_start ON radius_sessions_active(start_time);

CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_session ON radius_sessions_archive(acct_session_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_user ON radius_sessions_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_dates ON radius_sessions_archive(start_time, stop_time);

CREATE INDEX IF NOT EXISTS idx_radius_accounting_session ON radius_accounting(acct_session_id);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_username ON radius_accounting(username);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_event ON radius_accounting(event_type, event_time);

-- Automatic session archival (30 days)
CREATE OR REPLACE FUNCTION archive_old_radius_sessions()
RETURNS void AS $$
BEGIN
    INSERT INTO radius_sessions_archive
    SELECT * FROM radius_sessions_active
    WHERE last_update < NOW() - INTERVAL '30 days';
    
    DELETE FROM radius_sessions_active
    WHERE last_update < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add trigger to sync network_devices to radius_nas
CREATE OR REPLACE FUNCTION sync_network_devices_to_radius_nas()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IN ('router', 'mikrotik', 'ubiquiti', 'cisco') AND NEW.status = 'active' THEN
        INSERT INTO radius_nas (
            network_device_id, name, short_name, ip_address, 
            secret, type, location_id, status
        ) VALUES (
            NEW.id,
            NEW.name,
            SUBSTRING(NEW.name FROM 1 FOR 32),
            NEW.ip_address::inet,
            COALESCE(NEW.radius_secret, 'default_secret'),
            COALESCE(NEW.type, 'mikrotik'),
            NEW.location_id,
            NEW.status
        )
        ON CONFLICT (ip_address) DO UPDATE SET
            name = EXCLUDED.name,
            secret = EXCLUDED.secret,
            status = EXCLUDED.status,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_network_devices
AFTER INSERT OR UPDATE ON network_devices
FOR EACH ROW
EXECUTE FUNCTION sync_network_devices_to_radius_nas();

COMMENT ON TABLE radius_nas IS 'Network Access Servers (synced from network_devices table)';
COMMENT ON TABLE radius_users IS 'RADIUS users linked to customers and customer_services';
COMMENT ON TABLE radius_sessions_active IS 'Currently active RADIUS sessions';
COMMENT ON TABLE radius_sessions_archive IS 'Historical RADIUS sessions (>30 days)';
COMMENT ON TABLE radius_accounting IS 'Detailed accounting events for audit trail';
COMMENT ON TRIGGER trigger_sync_network_devices ON network_devices IS 'Automatically sync routers to RADIUS NAS table';
