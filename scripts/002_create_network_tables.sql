-- Network Management Tables
-- This script creates tables for network infrastructure management

-- Network Devices (Routers, Switches, Access Points)
CREATE TABLE IF NOT EXISTS network_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- router, switch, access_point, server
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    mac_address MACADDR,
    ip_address INET,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance, failed
    firmware_version VARCHAR(50),
    last_seen TIMESTAMP WITH TIME ZONE,
    uptime_seconds BIGINT DEFAULT 0,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    temperature DECIMAL(5,2),
    power_consumption DECIMAL(8,2),
    configuration JSONB DEFAULT '{}',
    monitoring_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Subnets
CREATE TABLE IF NOT EXISTS enhanced_subnets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    network CIDR NOT NULL,
    gateway INET,
    dns_primary INET,
    dns_secondary INET,
    dhcp_enabled BOOLEAN DEFAULT TRUE,
    dhcp_start INET,
    dhcp_end INET,
    vlan_id INTEGER,
    description TEXT,
    location VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced IP Addresses
CREATE TABLE IF NOT EXISTS enhanced_ip_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ip_address INET UNIQUE NOT NULL,
    subnet_id UUID REFERENCES enhanced_subnets(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES enhanced_customers(id),
    device_id UUID REFERENCES network_devices(id),
    status VARCHAR(50) DEFAULT 'available', -- available, assigned, reserved, blocked
    assignment_type VARCHAR(50), -- static, dhcp, reserved
    mac_address MACADDR,
    hostname VARCHAR(255),
    assigned_date TIMESTAMP WITH TIME ZONE,
    lease_expires TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Network Links (Connections between devices)
CREATE TABLE IF NOT EXISTS network_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255),
    device_a_id UUID REFERENCES network_devices(id) ON DELETE CASCADE,
    device_b_id UUID REFERENCES network_devices(id) ON DELETE CASCADE,
    interface_a VARCHAR(50),
    interface_b VARCHAR(50),
    link_type VARCHAR(50), -- fiber, ethernet, wireless, vpn
    bandwidth_mbps INTEGER,
    status VARCHAR(50) DEFAULT 'up', -- up, down, degraded
    utilization_percent DECIMAL(5,2),
    latency_ms DECIMAL(8,2),
    packet_loss_percent DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Network Events and Monitoring
CREATE TABLE IF NOT EXISTS network_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID REFERENCES network_devices(id),
    event_type VARCHAR(50) NOT NULL, -- alert, info, warning, error
    severity VARCHAR(20) DEFAULT 'info', -- critical, high, medium, low, info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100), -- snmp, ping, log, manual
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES enhanced_users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bandwidth Usage Tracking
CREATE TABLE IF NOT EXISTS bandwidth_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES enhanced_customers(id),
    device_id UUID REFERENCES network_devices(id),
    ip_address INET,
    date_hour TIMESTAMP WITH TIME ZONE NOT NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, device_id, ip_address, date_hour)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_network_devices_tenant ON network_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_type ON network_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_subnets_tenant ON enhanced_subnets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_ip_addresses_subnet ON enhanced_ip_addresses(subnet_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_ip_addresses_customer ON enhanced_ip_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_ip_addresses_status ON enhanced_ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_network_events_device ON network_events(device_id);
CREATE INDEX IF NOT EXISTS idx_network_events_created ON network_events(created_at);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_date ON bandwidth_usage(customer_id, date_hour);
