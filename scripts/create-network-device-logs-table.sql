-- Creating the missing network_device_logs table for router logging functionality
CREATE TABLE IF NOT EXISTS network_device_logs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL DEFAULT 'info',
    event_type VARCHAR(50),
    source_module VARCHAR(100),
    message TEXT NOT NULL,
    raw_log TEXT,
    log_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes for better query performance
    INDEX idx_network_device_logs_device_id (device_id),
    INDEX idx_network_device_logs_timestamp (log_timestamp),
    INDEX idx_network_device_logs_level (log_level)
);

-- Insert some sample log data for testing
INSERT INTO network_device_logs (device_id, log_level, event_type, source_module, message, log_timestamp) 
SELECT 
    nd.id,
    CASE 
        WHEN random() < 0.1 THEN 'error'
        WHEN random() < 0.3 THEN 'warning'
        ELSE 'info'
    END as log_level,
    CASE 
        WHEN random() < 0.2 THEN 'connection'
        WHEN random() < 0.4 THEN 'performance'
        WHEN random() < 0.6 THEN 'security'
        ELSE 'system'
    END as event_type,
    CASE 
        WHEN random() < 0.25 THEN 'dhcp'
        WHEN random() < 0.5 THEN 'firewall'
        WHEN random() < 0.75 THEN 'routing'
        ELSE 'system'
    END as source_module,
    CASE 
        WHEN random() < 0.2 THEN 'Device connected successfully'
        WHEN random() < 0.4 THEN 'High CPU usage detected'
        WHEN random() < 0.6 THEN 'Firewall rule updated'
        WHEN random() < 0.8 THEN 'DHCP lease renewed'
        ELSE 'System status check completed'
    END as message,
    NOW() - (random() * INTERVAL '30 days') as log_timestamp
FROM network_devices nd
WHERE nd.type = 'router'
LIMIT 100;
