-- Create routers table and related network management tables
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- mikrotik, ubiquiti, cisco, etc.
    location_id INTEGER REFERENCES locations(id),
    connection_type VARCHAR(50) NOT NULL, -- ssh, api, snmp
    hostname VARCHAR(255) NOT NULL UNIQUE,
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected', -- connected, disconnected, error
    last_seen TIMESTAMP,
    firmware_version VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    uptime BIGINT DEFAULT 0,
    cpu_usage NUMERIC(5,2) DEFAULT 0,
    memory_usage NUMERIC(5,2) DEFAULT 0,
    temperature NUMERIC(5,2),
    configuration JSONB DEFAULT '{}',
    sync_status VARCHAR(50) DEFAULT 'pending', -- synced, pending, failed
    last_sync TIMESTAMP,
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sync_jobs table for tracking synchronization tasks
CREATE TABLE IF NOT EXISTS sync_jobs (
    id BIGSERIAL PRIMARY KEY,
    router_id BIGINT REFERENCES routers(id),
    job_type VARCHAR(100) NOT NULL, -- full_sync, config_sync, status_check
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    progress INTEGER DEFAULT 0, -- 0-100
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_routers_location ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_sync_status ON routers(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_router ON sync_jobs(router_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- Insert sample router data
INSERT INTO routers (name, type, location_id, connection_type, hostname, username, password, status) VALUES
('Main Gateway Router', 'mikrotik', 1, 'api', '192.168.1.1', 'admin', 'password123', 'connected'),
('Branch Office Router', 'ubiquiti', 2, 'ssh', '192.168.2.1', 'admin', 'password123', 'disconnected'),
('Backup Router', 'cisco', 1, 'snmp', '192.168.1.2', 'admin', 'password123', 'connected')
ON CONFLICT (hostname) DO NOTHING;
