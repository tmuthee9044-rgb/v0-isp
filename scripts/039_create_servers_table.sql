-- Create servers table for infrastructure monitoring
CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- web, database, radius, dns, mail, backup, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'online', -- online, offline, maintenance, warning
  ip_address INET NOT NULL,
  location VARCHAR(255),
  cpu_usage DECIMAL(5,2) DEFAULT 0, -- percentage
  memory_usage DECIMAL(5,2) DEFAULT 0, -- percentage
  disk_usage DECIMAL(5,2) DEFAULT 0, -- percentage
  uptime_hours INTEGER DEFAULT 0,
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_type ON servers(type);
CREATE INDEX IF NOT EXISTS idx_servers_last_checked ON servers(last_checked);

-- Insert initial server data based on typical ISP infrastructure
INSERT INTO servers (name, hostname, type, status, ip_address, location, cpu_usage, memory_usage, disk_usage, uptime_hours) VALUES
  ('Main Web Server', 'web01.isp.local', 'web', 'online', '192.168.1.10', 'Data Center A', 45.2, 62.8, 58.3, 720),
  ('Backup Web Server', 'web02.isp.local', 'web', 'online', '192.168.1.11', 'Data Center B', 32.5, 48.9, 45.2, 680),
  ('Primary Database', 'db01.isp.local', 'database', 'online', '192.168.1.20', 'Data Center A', 68.4, 78.5, 72.1, 720),
  ('Replica Database', 'db02.isp.local', 'database', 'online', '192.168.1.21', 'Data Center B', 42.3, 65.2, 68.9, 680),
  ('RADIUS Server 1', 'radius01.isp.local', 'radius', 'online', '192.168.1.30', 'Data Center A', 28.7, 35.4, 42.6, 720),
  ('RADIUS Server 2', 'radius02.isp.local', 'radius', 'online', '192.168.1.31', 'Data Center B', 25.3, 32.1, 38.9, 680),
  ('DNS Server 1', 'dns01.isp.local', 'dns', 'online', '192.168.1.40', 'Data Center A', 15.2, 22.8, 28.4, 720),
  ('DNS Server 2', 'dns02.isp.local', 'dns', 'online', '192.168.1.41', 'Data Center B', 12.8, 19.5, 25.7, 680),
  ('Mail Server', 'mail01.isp.local', 'mail', 'online', '192.168.1.50', 'Data Center A', 38.6, 52.3, 65.8, 720),
  ('Backup Server', 'backup01.isp.local', 'backup', 'online', '192.168.1.60', 'Data Center A', 55.9, 45.7, 82.4, 720),
  ('Monitoring Server', 'monitor01.isp.local', 'monitoring', 'online', '192.168.1.70', 'Data Center A', 22.4, 38.6, 35.2, 720),
  ('VPN Server', 'vpn01.isp.local', 'vpn', 'online', '192.168.1.80', 'Data Center A', 18.5, 28.9, 32.1, 720);

-- Log the table creation
INSERT INTO system_logs (action, details, user_id, created_at)
VALUES ('create_table', 'Created servers table for infrastructure monitoring', 1, CURRENT_TIMESTAMP);
