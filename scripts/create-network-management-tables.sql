-- Network Management and Service Activation Tables

-- Network devices (routers, switches, access points, etc.)
CREATE TABLE IF NOT EXISTS network_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL, -- router, switch, access_point, modem, firewall
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(255) UNIQUE,
    mac_address VARCHAR(17),
    ip_address INET,
    management_ip INET,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance, failed
    firmware_version VARCHAR(100),
    configuration JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '{}', -- supported features, port count, etc.
    last_seen TIMESTAMP,
    uptime_seconds BIGINT DEFAULT 0,
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    memory_usage DECIMAL(5,2) DEFAULT 0,
    temperature DECIMAL(5,2),
    power_consumption DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Network topology and connections
CREATE TABLE IF NOT EXISTS network_topology (
    id SERIAL PRIMARY KEY,
    parent_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    child_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    connection_type VARCHAR(50), -- ethernet, fiber, wireless, vpn
    port_number_parent VARCHAR(20),
    port_number_child VARCHAR(20),
    bandwidth_mbps INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_device_id, child_device_id)
);

-- Service provisioning templates
CREATE TABLE IF NOT EXISTS service_provisioning_templates (
    id SERIAL PRIMARY KEY,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    configuration_template JSONB NOT NULL,
    qos_policy JSONB DEFAULT '{}',
    bandwidth_profile JSONB DEFAULT '{}',
    firewall_rules JSONB DEFAULT '[]',
    routing_rules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service activation workflows
CREATE TABLE IF NOT EXISTS service_activations (
    id SERIAL PRIMARY KEY,
    customer_service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id) ON DELETE CASCADE,
    activation_type VARCHAR(50) NOT NULL, -- new, upgrade, downgrade, suspend, resume
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed, cancelled
    assigned_device_id INTEGER REFERENCES network_devices(id),
    assigned_ip_address INET,
    assigned_vlan INTEGER,
    bandwidth_allocated INTEGER, -- in Mbps
    qos_profile JSONB DEFAULT '{}',
    configuration_applied JSONB DEFAULT '{}',
    activation_steps JSONB DEFAULT '[]',
    current_step INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_reason TEXT,
    activated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QoS policies and bandwidth management
CREATE TABLE IF NOT EXISTS qos_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL, -- bandwidth_limit, traffic_shaping, priority_queue
    configuration JSONB NOT NULL,
    service_plans INTEGER[] DEFAULT '{}', -- array of service plan IDs
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bandwidth allocation tracking
CREATE TABLE IF NOT EXISTS bandwidth_allocations (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    customer_service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    allocated_download_mbps INTEGER NOT NULL,
    allocated_upload_mbps INTEGER NOT NULL,
    burst_download_mbps INTEGER,
    burst_upload_mbps INTEGER,
    priority_level INTEGER DEFAULT 3, -- 1=highest, 5=lowest
    traffic_class VARCHAR(50) DEFAULT 'standard',
    allocation_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Network monitoring and performance metrics
CREATE TABLE IF NOT EXISTS network_performance_metrics (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- cpu, memory, bandwidth, latency, packet_loss
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20), -- percent, mbps, ms, packets
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    is_alert BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Service activation logs
CREATE TABLE IF NOT EXISTS service_activation_logs (
    id SERIAL PRIMARY KEY,
    activation_id INTEGER REFERENCES service_activations(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_status VARCHAR(50) NOT NULL, -- started, completed, failed, skipped
    step_details JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- IP address management
CREATE TABLE IF NOT EXISTS ip_address_pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(255) NOT NULL,
    network_cidr CIDR NOT NULL,
    gateway_ip INET,
    dns_servers INET[] DEFAULT '{}',
    pool_type VARCHAR(50) DEFAULT 'customer', -- customer, management, infrastructure
    vlan_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ip_address_assignments (
    id SERIAL PRIMARY KEY,
    pool_id INTEGER REFERENCES ip_address_pools(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    customer_service_id INTEGER REFERENCES customer_services(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    assignment_type VARCHAR(50) NOT NULL, -- static, dhcp, reserved
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, available, reserved, expired
    lease_start TIMESTAMP,
    lease_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ip_address)
);

-- Equipment provisioning queue
CREATE TABLE IF NOT EXISTS equipment_provisioning_queue (
    id SERIAL PRIMARY KEY,
    customer_service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL,
    equipment_model VARCHAR(100),
    configuration JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 3, -- 1=highest, 5=lowest
    status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, configured, deployed, failed
    assigned_device_id INTEGER REFERENCES network_devices(id),
    assigned_technician INTEGER REFERENCES users(id),
    scheduled_date DATE,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_network_devices_type ON network_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_network_devices_ip ON network_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_service_activations_status ON service_activations(status);
CREATE INDEX IF NOT EXISTS idx_service_activations_customer ON service_activations(customer_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_allocations_device ON bandwidth_allocations(device_id);
CREATE INDEX IF NOT EXISTS idx_network_performance_device_type ON network_performance_metrics(device_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_ip_assignments_status ON ip_address_assignments(status);
CREATE INDEX IF NOT EXISTS idx_equipment_queue_status ON equipment_provisioning_queue(status);

-- Insert sample network devices
INSERT INTO network_devices (device_name, device_type, brand, model, ip_address, management_ip, location, status) VALUES
('Core-Router-01', 'router', 'Cisco', 'ISR4331', '192.168.1.1', '192.168.100.1', 'Main Office', 'active'),
('Distribution-Switch-01', 'switch', 'HP', 'ProCurve 2920', '192.168.1.2', '192.168.100.2', 'Main Office', 'active'),
('Access-Point-01', 'access_point', 'Ubiquiti', 'UniFi AC Pro', '192.168.1.10', '192.168.100.10', 'Building A', 'active'),
('Firewall-01', 'firewall', 'pfSense', 'SG-3100', '192.168.1.254', '192.168.100.254', 'Main Office', 'active')
ON CONFLICT DO NOTHING;

-- Insert sample QoS policies
INSERT INTO qos_policies (policy_name, description, policy_type, configuration) VALUES
('Residential Basic', 'Standard QoS for residential customers', 'bandwidth_limit', '{"download_mbps": 10, "upload_mbps": 2, "burst_ratio": 1.5}'),
('Business Premium', 'High priority QoS for business customers', 'priority_queue', '{"download_mbps": 100, "upload_mbps": 50, "priority": 1, "guaranteed_bandwidth": 0.8}'),
('Gaming Optimized', 'Low latency QoS for gaming services', 'traffic_shaping', '{"download_mbps": 50, "upload_mbps": 10, "latency_target": 20, "jitter_control": true}')
ON CONFLICT DO NOTHING;

-- Insert sample IP pools
INSERT INTO ip_address_pools (pool_name, network_cidr, gateway_ip, dns_servers, pool_type) VALUES
('Customer Pool A', '10.0.0.0/16', '10.0.0.1', ARRAY['8.8.8.8', '8.8.4.4'], 'customer'),
('Management Pool', '192.168.100.0/24', '192.168.100.1', ARRAY['192.168.100.1'], 'management'),
('Infrastructure Pool', '172.16.0.0/16', '172.16.0.1', ARRAY['172.16.0.1'], 'infrastructure')
ON CONFLICT DO NOTHING;
