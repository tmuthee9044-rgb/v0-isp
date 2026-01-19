-- OLT (Optical Line Terminal) and Fiber Management
-- Supports GPON/EPON ONT provisioning, VLAN assignment, and fiber infrastructure

-- OLT devices (central fiber aggregation points)
CREATE TABLE IF NOT EXISTS olt_devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  vendor VARCHAR(50) NOT NULL, -- huawei, zte, nokia, etc.
  model VARCHAR(100),
  ip_address VARCHAR(45) NOT NULL,
  management_ip VARCHAR(45),
  snmp_community VARCHAR(100),
  snmp_version VARCHAR(10) DEFAULT 'v2c',
  username VARCHAR(100),
  password_encrypted VARCHAR(255),
  api_port INTEGER DEFAULT 161,
  telnet_port INTEGER DEFAULT 23,
  ssh_port INTEGER DEFAULT 22,
  
  -- Capacity
  max_ports INTEGER NOT NULL,
  max_onts_per_port INTEGER DEFAULT 128,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, maintenance, offline
  location_id INTEGER REFERENCES locations(id),
  
  -- Metadata
  firmware_version VARCHAR(50),
  serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OLT Ports (PON ports on the OLT)
CREATE TABLE IF NOT EXISTS olt_ports (
  id SERIAL PRIMARY KEY,
  olt_id INTEGER NOT NULL REFERENCES olt_devices(id) ON DELETE CASCADE,
  port_number INTEGER NOT NULL,
  port_type VARCHAR(20) DEFAULT 'GPON', -- GPON, EPON, XGS-PON
  status VARCHAR(20) DEFAULT 'active',
  
  -- Configuration
  max_distance_km INTEGER DEFAULT 20,
  split_ratio VARCHAR(10) DEFAULT '1:64', -- 1:32, 1:64, 1:128
  
  -- VLAN configuration for this port
  management_vlan INTEGER DEFAULT 100,
  data_vlan_start INTEGER DEFAULT 200,
  data_vlan_end INTEGER DEFAULT 299,
  voice_vlan INTEGER,
  iptv_vlan INTEGER,
  
  -- Statistics
  ont_count INTEGER DEFAULT 0,
  rx_power_dbm DECIMAL(10, 2),
  tx_power_dbm DECIMAL(10, 2),
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(olt_id, port_number)
);

-- ONTs (Optical Network Terminals - customer equipment)
CREATE TABLE IF NOT EXISTS onts (
  id SERIAL PRIMARY KEY,
  olt_port_id INTEGER NOT NULL REFERENCES olt_ports(id) ON DELETE CASCADE,
  ont_id INTEGER NOT NULL, -- ONT ID on the OLT (0-127)
  serial_number VARCHAR(100) UNIQUE,
  mac_address VARCHAR(17),
  
  -- Customer mapping
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, offline, suspended
  registration_status VARCHAR(20) DEFAULT 'registered', -- registered, unregistered, auth_failed
  
  -- Configuration
  ont_model VARCHAR(100),
  ont_vendor VARCHAR(50),
  firmware_version VARCHAR(50),
  profile_name VARCHAR(100), -- Service profile (speed, VLAN, QoS)
  
  -- VLAN assignments
  data_vlan INTEGER,
  voice_vlan INTEGER,
  iptv_vlan INTEGER,
  management_vlan INTEGER,
  
  -- Optical metrics
  rx_power_dbm DECIMAL(10, 2),
  tx_power_dbm DECIMAL(10, 2),
  distance_meters INTEGER,
  last_online TIMESTAMP,
  last_offline TIMESTAMP,
  
  -- Installation details
  installation_address TEXT,
  installation_date DATE,
  technician_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(olt_port_id, ont_id)
);

-- Fiber cables (physical infrastructure)
CREATE TABLE IF NOT EXISTS fiber_cables (
  id SERIAL PRIMARY KEY,
  cable_name VARCHAR(255) NOT NULL,
  cable_type VARCHAR(50), -- distribution, feeder, drop
  fiber_count INTEGER NOT NULL,
  start_location_id INTEGER REFERENCES locations(id),
  end_location_id INTEGER REFERENCES locations(id),
  length_meters INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fiber splitters (passive optical splitters)
CREATE TABLE IF NOT EXISTS fiber_splitters (
  id SERIAL PRIMARY KEY,
  splitter_name VARCHAR(255) NOT NULL,
  location_id INTEGER REFERENCES locations(id),
  split_ratio VARCHAR(10) NOT NULL, -- 1:2, 1:4, 1:8, 1:16, 1:32, 1:64
  input_fiber_id INTEGER REFERENCES fiber_cables(id),
  output_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  installed_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ONT service profiles (speed tiers, VLAN templates)
CREATE TABLE IF NOT EXISTS ont_profiles (
  id SERIAL PRIMARY KEY,
  profile_name VARCHAR(100) NOT NULL UNIQUE,
  download_mbps INTEGER NOT NULL,
  upload_mbps INTEGER NOT NULL,
  
  -- VLAN configuration
  data_vlan INTEGER,
  voice_vlan INTEGER,
  iptv_vlan INTEGER,
  management_vlan INTEGER DEFAULT 100,
  
  -- QoS
  priority INTEGER DEFAULT 0,
  bandwidth_profile VARCHAR(100),
  
  -- Restrictions
  multicast_enabled BOOLEAN DEFAULT false,
  ipv6_enabled BOOLEAN DEFAULT true,
  
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_olt_devices_status ON olt_devices(status);
CREATE INDEX idx_olt_devices_location ON olt_devices(location_id);
CREATE INDEX idx_olt_ports_olt ON olt_ports(olt_id);
CREATE INDEX idx_olt_ports_status ON olt_ports(status);
CREATE INDEX idx_onts_olt_port ON onts(olt_port_id);
CREATE INDEX idx_onts_customer ON onts(customer_id);
CREATE INDEX idx_onts_service ON onts(service_id);
CREATE INDEX idx_onts_status ON onts(status);
CREATE INDEX idx_onts_serial ON onts(serial_number);
CREATE INDEX idx_fiber_cables_locations ON fiber_cables(start_location_id, end_location_id);
CREATE INDEX idx_fiber_splitters_location ON fiber_splitters(location_id);

COMMIT;
