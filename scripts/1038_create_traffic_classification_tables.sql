-- Traffic Classification and DPI Integration
-- Supports application-level QoS, analytics, and content filtering

-- Traffic categories (application types)
CREATE TABLE IF NOT EXISTS traffic_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  qos_enabled BOOLEAN DEFAULT false,
  
  -- QoS settings
  min_bandwidth_mbps INTEGER, -- Guaranteed bandwidth
  max_bandwidth_mbps INTEGER, -- Bandwidth cap
  latency_sensitive BOOLEAN DEFAULT false,
  
  -- Examples of applications in this category
  example_apps TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DPI application signatures (for traffic identification)
CREATE TABLE IF NOT EXISTS dpi_signatures (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES traffic_categories(id) ON DELETE CASCADE,
  application_name VARCHAR(100) NOT NULL,
  protocol VARCHAR(20), -- tcp, udp, http, https
  
  -- Matching criteria
  port_ranges VARCHAR(255), -- "80,443,8080-8090"
  domain_patterns TEXT, -- "*.netflix.com,*.youtube.com"
  url_patterns TEXT,
  user_agent_patterns TEXT,
  
  -- Layer 7 patterns (for deep packet inspection)
  packet_signature BYTEA,
  ssl_sni_patterns TEXT, -- For HTTPS identification
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time traffic flow tracking
CREATE TABLE IF NOT EXISTS traffic_flows (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  
  -- Flow identification
  src_ip INET NOT NULL,
  dst_ip INET NOT NULL,
  src_port INTEGER,
  dst_port INTEGER,
  protocol VARCHAR(10), -- tcp, udp, icmp
  
  -- Classification
  category_id INTEGER REFERENCES traffic_categories(id),
  application_name VARCHAR(100),
  
  -- Metrics
  bytes_sent BIGINT DEFAULT 0,
  bytes_received BIGINT DEFAULT 0,
  packets_sent BIGINT DEFAULT 0,
  packets_received BIGINT DEFAULT 0,
  
  -- Timing
  flow_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flow_end TIMESTAMP,
  duration_seconds INTEGER,
  
  -- QoS applied
  qos_class VARCHAR(50),
  throttled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated traffic statistics (for analytics)
CREATE TABLE IF NOT EXISTS traffic_statistics (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES traffic_categories(id),
  
  -- Time period
  date DATE NOT NULL,
  hour INTEGER, -- 0-23 for hourly stats, NULL for daily
  
  -- Metrics
  total_mb DECIMAL(15, 2) DEFAULT 0,
  upload_mb DECIMAL(15, 2) DEFAULT 0,
  download_mb DECIMAL(15, 2) DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id, category_id, date, hour)
);

-- QoS policies (define traffic prioritization rules)
CREATE TABLE IF NOT EXISTS qos_policies (
  id SERIAL PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Traffic shaping
  total_bandwidth_mbps INTEGER NOT NULL,
  
  -- Category allocations (JSON)
  category_allocations JSONB, -- {"gaming": 30, "streaming": 40, "browsing": 20, "other": 10}
  
  -- Time-based rules
  peak_hours VARCHAR(255), -- JSON: ["08:00-12:00", "18:00-23:00"]
  off_peak_hours VARCHAR(255),
  peak_multiplier DECIMAL(3, 2) DEFAULT 1.0, -- Bandwidth adjustment during peak
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer QoS assignments
CREATE TABLE IF NOT EXISTS customer_qos_assignments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  qos_policy_id INTEGER REFERENCES qos_policies(id),
  
  -- Overrides (customer-specific adjustments)
  custom_allocations JSONB,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id)
);

-- Indexes for performance
CREATE INDEX idx_traffic_flows_customer ON traffic_flows(customer_id);
CREATE INDEX idx_traffic_flows_service ON traffic_flows(service_id);
CREATE INDEX idx_traffic_flows_category ON traffic_flows(category_id);
CREATE INDEX idx_traffic_flows_start ON traffic_flows(flow_start);
CREATE INDEX idx_traffic_flows_src_dst ON traffic_flows(src_ip, dst_ip);
CREATE INDEX idx_traffic_stats_customer_date ON traffic_statistics(customer_id, date DESC);
CREATE INDEX idx_traffic_stats_service ON traffic_statistics(service_id);
CREATE INDEX idx_traffic_stats_category ON traffic_statistics(category_id);
CREATE INDEX idx_dpi_signatures_category ON dpi_signatures(category_id);
CREATE INDEX idx_qos_assignments_customer ON customer_qos_assignments(customer_id);

-- Insert default traffic categories
INSERT INTO traffic_categories (category_name, description, priority, qos_enabled, latency_sensitive, example_apps) VALUES
  ('Gaming', 'Online gaming applications', 2, true, true, 'Fortnite, PUBG, League of Legends'),
  ('Video Streaming', 'Video streaming services', 3, true, false, 'Netflix, YouTube, Disney+'),
  ('VoIP', 'Voice and video calls', 1, true, true, 'WhatsApp Calls, Zoom, Teams'),
  ('Social Media', 'Social networking apps', 5, false, false, 'Facebook, Instagram, Twitter'),
  ('Web Browsing', 'General web traffic', 5, false, false, 'HTTP/HTTPS browsing'),
  ('File Sharing', 'Torrents and P2P', 8, true, false, 'BitTorrent, uTorrent'),
  ('Cloud Storage', 'Cloud backup and sync', 6, false, false, 'Dropbox, Google Drive, OneDrive'),
  ('Music Streaming', 'Audio streaming services', 4, false, false, 'Spotify, Apple Music'),
  ('Software Updates', 'OS and app updates', 7, false, false, 'Windows Update, App Store'),
  ('Other', 'Unclassified traffic', 9, false, false, 'Unknown applications')
ON CONFLICT (category_name) DO NOTHING;

COMMIT;
