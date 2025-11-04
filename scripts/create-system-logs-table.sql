-- Create system_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'DEBUG')),
    source VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    ip_address INET,
    user_id INTEGER REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    details JSONB,
    session_id VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_customer_id ON system_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_ip_address ON system_logs(ip_address);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_logs_updated_at
    BEFORE UPDATE ON system_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_system_logs_updated_at();

-- Insert sample log entries for testing
INSERT INTO system_logs (level, source, category, message, ip_address, details) VALUES
('INFO', 'OpenVPN', 'openvpn', 'Client connected successfully', '192.168.1.100', '{"client_ip": "10.8.0.2", "duration": "00:45:30"}'),
('SUCCESS', 'M-Pesa', 'mpesa', 'Payment received: KES 2,500', '192.168.1.50', '{"transaction_id": "QA12345678", "customer_id": "1234", "amount": 2500}'),
('WARNING', 'RADIUS', 'radius', 'Authentication timeout for user', '192.168.1.3', '{"timeout_duration": "30s", "retry_count": 3}'),
('ERROR', 'Router-001', 'router', 'High CPU usage detected: 95%', '192.168.1.1', '{"cpu_usage": 95, "memory_usage": 78, "uptime": "15d 4h 30m"}'),
('INFO', 'System', 'system', 'Database backup completed successfully', NULL, '{"backup_size": "2.5GB", "duration": "00:15:30"}'),
('INFO', 'Admin Portal', 'admin', 'Admin user logged in', '192.168.1.25', '{"session_id": "sess_abc123", "browser": "Chrome 120.0"}'),
('INFO', 'Customer Portal', 'user', 'Customer viewed billing statement', '41.90.64.15', '{"customer_id": "789", "statement_month": "December 2023"}'),
('WARNING', 'OpenVPN', 'openvpn', 'Client disconnected unexpectedly', '192.168.1.100', '{"session_duration": "01:30:45", "reason": "network_error"}');

-- Add comment to table
COMMENT ON TABLE system_logs IS 'Comprehensive system logging for OpenVPN, RADIUS, M-Pesa, router events, and user activities';
