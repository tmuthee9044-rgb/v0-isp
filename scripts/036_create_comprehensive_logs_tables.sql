-- Create comprehensive logging system for ISP management

-- Main system logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'DEBUG')),
    source VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    ip_address INET,
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OpenVPN specific logs
CREATE TABLE IF NOT EXISTS openvpn_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- connect, disconnect, auth_success, auth_failure, etc.
    client_ip INET,
    vpn_ip INET,
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    duration INTERVAL,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    disconnect_reason VARCHAR(100),
    certificate_cn VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RADIUS authentication and accounting logs
CREATE TABLE IF NOT EXISTS radius_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- auth_request, auth_accept, auth_reject, acct_start, acct_stop
    username VARCHAR(100),
    client_ip INET,
    nas_ip INET,
    nas_port INTEGER,
    service_type VARCHAR(50),
    framed_ip INET,
    session_id VARCHAR(100),
    session_time INTEGER, -- in seconds
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    terminate_cause VARCHAR(100),
    reply_message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- M-Pesa transaction logs
CREATE TABLE IF NOT EXISTS mpesa_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- payment_request, payment_success, payment_failure, callback, etc.
    transaction_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(100),
    phone_number VARCHAR(20),
    amount DECIMAL(10,2),
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    customer_id INTEGER,
    result_code INTEGER,
    result_desc TEXT,
    callback_data JSONB,
    ip_address INET,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Router and network device logs
CREATE TABLE IF NOT EXISTS router_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(100),
    device_ip INET,
    event_type VARCHAR(50) NOT NULL, -- status_change, performance_alert, config_change, etc.
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    bandwidth_usage DECIMAL(10,2),
    uptime INTERVAL,
    interface_status JSONB,
    alert_threshold_exceeded BOOLEAN DEFAULT FALSE,
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System activity logs (backups, maintenance, etc.)
CREATE TABLE IF NOT EXISTS system_activity_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- backup, maintenance, update, restart, etc.
    component VARCHAR(100), -- database, web_server, radius_server, etc.
    status VARCHAR(20) NOT NULL, -- started, completed, failed, in_progress
    duration INTERVAL,
    file_size BIGINT, -- for backups
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    admin_user_id VARCHAR(100) NOT NULL,
    admin_username VARCHAR(100),
    action VARCHAR(100) NOT NULL, -- login, logout, create_user, delete_customer, etc.
    target_type VARCHAR(50), -- customer, user, service, etc.
    target_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    changes_made JSONB, -- before/after values for updates
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User/Customer activity logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    user_id INTEGER,
    username VARCHAR(100),
    activity_type VARCHAR(50) NOT NULL, -- login, logout, view_bill, make_payment, etc.
    page_accessed VARCHAR(200),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    session_duration INTERVAL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Critical events view for quick access to important logs
CREATE OR REPLACE VIEW critical_events AS
SELECT 
    'system' as log_type,
    id,
    timestamp,
    level,
    source,
    message,
    ip_address,
    user_id,
    details
FROM system_logs 
WHERE level IN ('ERROR', 'WARNING')

UNION ALL

SELECT 
    'openvpn' as log_type,
    id,
    timestamp,
    level,
    event_type as source,
    CASE 
        WHEN event_type = 'auth_failure' THEN 'OpenVPN authentication failed for user: ' || COALESCE(user_id, 'unknown')
        WHEN event_type = 'disconnect' AND disconnect_reason IS NOT NULL THEN 'OpenVPN client disconnected: ' || disconnect_reason
        ELSE 'OpenVPN event: ' || event_type
    END as message,
    client_ip as ip_address,
    user_id,
    details
FROM openvpn_logs 
WHERE level IN ('ERROR', 'WARNING')

UNION ALL

SELECT 
    'radius' as log_type,
    id,
    timestamp,
    level,
    event_type as source,
    CASE 
        WHEN event_type = 'auth_reject' THEN 'RADIUS authentication rejected for: ' || COALESCE(username, 'unknown')
        ELSE 'RADIUS event: ' || event_type || COALESCE(' - ' || reply_message, '')
    END as message,
    client_ip as ip_address,
    username as user_id,
    details
FROM radius_logs 
WHERE level IN ('ERROR', 'WARNING')

UNION ALL

SELECT 
    'mpesa' as log_type,
    id,
    timestamp,
    level,
    event_type as source,
    CASE 
        WHEN event_type = 'payment_failure' THEN 'M-Pesa payment failed: ' || COALESCE(result_desc, 'Unknown error')
        ELSE 'M-Pesa event: ' || event_type
    END as message,
    ip_address,
    phone_number as user_id,
    details
FROM mpesa_logs 
WHERE level IN ('ERROR', 'WARNING')

UNION ALL

SELECT 
    'router' as log_type,
    id,
    timestamp,
    level,
    device_name as source,
    message,
    device_ip as ip_address,
    NULL as user_id,
    details
FROM router_logs 
WHERE level IN ('ERROR', 'WARNING') OR alert_threshold_exceeded = TRUE

ORDER BY timestamp DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs( DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_ip_address ON system_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_openvpn_logs_timestamp ON openvpn_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_openvpn_logs_user_id ON openvpn_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_openvpn_logs_client_ip ON openvpn_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_openvpn_logs_event_type ON openvpn_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_radius_logs_timestamp ON radius_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_radius_logs_username ON radius_logs(username);
CREATE INDEX IF NOT EXISTS idx_radius_logs_client_ip ON radius_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_radius_logs_event_type ON radius_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_mpesa_logs_timestamp ON mpesa_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_transaction_id ON mpesa_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_phone_number ON mpesa_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_customer_id ON mpesa_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_router_logs_timestamp ON router_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_router_logs_device_id ON router_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_router_logs_device_ip ON router_logs(device_ip);
CREATE INDEX IF NOT EXISTS idx_router_logs_alert_threshold ON router_logs(alert_threshold_exceeded);

CREATE INDEX IF NOT EXISTS idx_system_activity_logs_timestamp ON system_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_activity_type ON system_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_status ON system_activity_logs(status);

CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_ip_address ON admin_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_ip_address ON user_activity_logs(ip_address);

-- Insert sample data for testing
INSERT INTO system_logs (level, source, category, message, ip_address, user_id, details) VALUES
('INFO', 'Authentication', 'system', 'User admin logged in successfully', '192.168.1.100', 'admin', '{"browser": "Chrome 120.0", "session_id": "sess_abc123"}'),
('WARNING', 'Network', 'router', 'Router-003 connection timeout', '192.168.1.3', NULL, '{"timeout_duration": "30s", "retry_count": 3}'),
('ERROR', 'Billing', 'system', 'Payment processing failed for customer ID 1234', '192.168.1.50', 'customer1234', '{"error_code": "PAYMENT_FAILED", "amount": 2500}'),
('INFO', 'Customer', 'user', 'New customer registration completed', '192.168.1.25', 'customer789', '{"customer_id": 789, "plan": "Premium"}'),
('SUCCESS', 'System', 'system', 'Database backup completed successfully', NULL, NULL, '{"backup_size": "2.5GB", "duration": "00:15:30"}');

INSERT INTO openvpn_logs (level, event_type, client_ip, vpn_ip, user_id, session_id, duration, bytes_sent, bytes_received, details) VALUES
('INFO', 'connect', '41.90.64.15', '10.8.0.2', 'user123', 'ovpn_sess_001', NULL, 0, 0, '{"client_version": "OpenVPN 2.5.8", "cipher": "AES-256-GCM"}'),
('INFO', 'disconnect', '41.90.64.15', '10.8.0.2', 'user123', 'ovpn_sess_001', '01:30:45', 1048576, 5242880, '{"reason": "user_disconnect"}'),
('WARNING', 'auth_failure', '41.90.64.20', NULL, 'user456', NULL, NULL, 0, 0, '{"reason": "invalid_certificate", "attempts": 3}');

INSERT INTO radius_logs (level, event_type, username, client_ip, nas_ip, session_id, session_time, input_octets, output_octets, reply_message, details) VALUES
('INFO', 'auth_accept', 'user123', '192.168.1.100', '192.168.1.1', 'radius_sess_001', 3600, 1048576, 2097152, 'Authentication successful', '{"service_type": "Framed-User", "framed_ip": "192.168.100.10"}'),
('WARNING', 'auth_reject', 'user456', '192.168.1.101', '192.168.1.1', NULL, 0, 0, 0, 'Invalid credentials', '{"attempts": 3, "lockout": true}');

INSERT INTO mpesa_logs (level, event_type, transaction_id, mpesa_receipt_number, phone_number, amount, account_reference, customer_id, result_code, result_desc, details) VALUES
('SUCCESS', 'payment_success', 'TXN123456789', 'QA12345678', '254712345678', 2500.00, 'BILL_001234', 1234, 0, 'The service request is processed successfully', '{"payment_method": "M-Pesa", "timestamp": "2024-01-15T14:25:12Z"}'),
('ERROR', 'payment_failure', 'TXN123456790', NULL, '254712345679', 1500.00, 'BILL_001235', 1235, 1, 'Insufficient funds', '{"error_details": "Customer has insufficient balance"}');

INSERT INTO router_logs (level, device_id, device_name, device_ip, event_type, cpu_usage, memory_usage, bandwidth_usage, uptime, message, alert_threshold_exceeded, details) VALUES
('WARNING', 'RTR001', 'Router-001', '192.168.1.1', 'performance_alert', 95.5, 78.2, 850.5, '15 days 04:30:00', 'High CPU usage detected: 95.5%', TRUE, '{"threshold": 90, "duration": "00:05:00"}'),
('INFO', 'RTR002', 'Router-002', '192.168.1.2', 'status_change', 45.2, 62.1, 420.3, '10 days 12:15:30', 'Router status: Online', FALSE, '{"previous_status": "Offline", "downtime": "00:02:15"}');

INSERT INTO admin_logs (level, admin_user_id, admin_username, action, target_type, target_id, ip_address, user_agent, session_id, changes_made, details) VALUES
('INFO', 'admin001', 'admin', 'login', NULL, NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'admin_sess_001', NULL, '{"login_time": "2024-01-15T14:30:25Z"}'),
('INFO', 'admin001', 'admin', 'create_customer', 'customer', '1236', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'admin_sess_001', '{"name": "John Doe", "email": "john@example.com", "plan": "Basic"}', '{"customer_id": 1236}');

INSERT INTO user_activity_logs (level, user_id, username, activity_type, page_accessed, ip_address, user_agent, session_id, details) VALUES
(1234, 'customer1234', 'INFO', 'login', '/portal/login', '41.90.64.15', 'Mozilla/5.0 (Android 12; Mobile)', 'user_sess_001', '{"login_method": "password"}'),
(1234, 'customer1234', 'INFO', 'view_bill', '/portal/billing', '41.90.64.15', 'Mozilla/5.0 (Android 12; Mobile)', 'user_sess_001', '{"bill_month": "December 2023", "amount": 2500}');

-- Create function to automatically log system events
CREATE OR REPLACE FUNCTION log_system_event(
    p_level VARCHAR(20),
    p_source VARCHAR(100),
    p_category VARCHAR(50),
    p_message TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_id VARCHAR(100) DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO system_logs (level, source, category, message, ip_address, user_id, details)
    VALUES (p_level, p_source, p_category, p_message, p_ip_address, p_user_id, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_logs(retention_days INTEGER DEFAULT 90) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up system_logs
    DELETE FROM system_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up openvpn_logs
    DELETE FROM openvpn_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up radius_logs
    DELETE FROM radius_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up mpesa_logs (keep longer for financial records)
    DELETE FROM mpesa_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * (retention_days * 2);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up router_logs
    DELETE FROM router_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up system_activity_logs
    DELETE FROM system_activity_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up admin_logs (keep longer for audit purposes)
    DELETE FROM admin_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * (retention_days * 3);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up user_activity_logs
    DELETE FROM user_activity_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE system_logs IS 'General system logs for all ISP management activities';
COMMENT ON TABLE openvpn_logs IS 'OpenVPN server connection and authentication logs';
COMMENT ON TABLE radius_logs IS 'RADIUS authentication and accounting logs';
COMMENT ON TABLE mpesa_logs IS 'M-Pesa payment transaction logs and callbacks';
COMMENT ON TABLE router_logs IS 'Network device status and performance monitoring logs';
COMMENT ON TABLE system_activity_logs IS 'System maintenance, backup, and administrative activity logs';
COMMENT ON TABLE admin_logs IS 'Administrator action audit logs';
COMMENT ON TABLE user_activity_logs IS 'Customer portal usage and interaction logs';
