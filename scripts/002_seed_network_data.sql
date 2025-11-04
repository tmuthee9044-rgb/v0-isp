-- Seed data for network management system
-- Insert sample routers
INSERT INTO routers (name, ip_address, type, username, password, status, location, description) VALUES
('Main Gateway Router', '192.168.1.1', 'mikrotik', 'admin', 'admin123', 'connected', 'Data Center', 'Primary gateway router for internet connectivity'),
('Branch Office Router', '192.168.2.1', 'ubiquiti', 'ubnt', 'ubnt123', 'connected', 'Branch Office', 'Router for branch office network'),
('Backup Router', '192.168.1.2', 'juniper', 'root', 'juniper123', 'disconnected', 'Data Center', 'Backup router for redundancy'),
('Customer Edge Router', '192.168.3.1', 'mikrotik', 'admin', 'admin123', 'connected', 'Customer Site A', 'Customer premises equipment');

-- Insert IP subnets
INSERT INTO ip_subnets (subnet, description, vlan_id, router_id, total_ips, used_ips) VALUES
('192.168.1.0/24', 'Management Network', 100, 1, 254, 45),
('192.168.2.0/24', 'Branch Office Network', 200, 2, 254, 78),
('10.0.0.0/16', 'Customer Network A', 300, 4, 65534, 1234),
('172.16.0.0/24', 'DMZ Network', 400, 1, 254, 12),
('192.168.10.0/24', 'Guest Network', 500, 1, 254, 23);

-- Insert IP addresses
INSERT INTO ip_addresses (ip_address, subnet_id, status, assigned_to, mac_address, hostname) VALUES
('192.168.1.1', 1, 'assigned', 'Gateway Router', '00:11:22:33:44:55', 'gateway.local'),
('192.168.1.10', 1, 'assigned', 'DNS Server', '00:11:22:33:44:56', 'dns.local'),
('192.168.1.20', 1, 'assigned', 'DHCP Server', '00:11:22:33:44:57', 'dhcp.local'),
('192.168.2.1', 2, 'assigned', 'Branch Router', '00:11:22:33:44:58', 'branch-gw.local'),
('10.0.1.100', 3, 'assigned', 'Customer Server', '00:11:22:33:44:59', 'customer-srv.local'),
('172.16.0.10', 4, 'assigned', 'Web Server', '00:11:22:33:44:60', 'web.dmz.local'),
('192.168.10.1', 5, 'assigned', 'Guest Gateway', '00:11:22:33:44:61', 'guest-gw.local');

-- Insert sync status for routers
INSERT INTO router_sync_status (router_id, sync_status, last_checked, retry_count, error_message) VALUES
(1, 'in_sync', NOW() - INTERVAL '5 minutes', 0, NULL),
(2, 'in_sync', NOW() - INTERVAL '3 minutes', 0, NULL),
(3, 'out_of_sync', NOW() - INTERVAL '1 hour', 2, 'Connection timeout'),
(4, 'in_sync', NOW() - INTERVAL '2 minutes', 0, NULL);

-- Insert router logs
INSERT INTO router_logs (router_id, action, status, message, details) VALUES
(1, 'connection_test', 'success', 'Router connection successful', '{"response_time": "45ms", "uptime": "30 days"}'),
(1, 'config_sync', 'success', 'Configuration synchronized', '{"rules_synced": 25, "interfaces_synced": 4}'),
(2, 'connection_test', 'success', 'Router connection successful', '{"response_time": "67ms", "uptime": "15 days"}'),
(3, 'connection_test', 'error', 'Connection timeout', '{"error": "timeout", "attempts": 3}'),
(4, 'config_sync', 'success', 'Configuration synchronized', '{"rules_synced": 18, "interfaces_synced": 2}');

-- Insert network events
INSERT INTO network_events (event_type, severity, message, router_id, affected_subnet, details) VALUES
('router_down', 'critical', 'Router 3 is unreachable', 3, NULL, '{"last_seen": "2024-01-15T10:30:00Z", "ping_failed": true}'),
('high_utilization', 'warning', 'High IP utilization in subnet 192.168.2.0/24', 2, 2, '{"utilization": 85, "threshold": 80}'),
('config_change', 'info', 'Firewall rules updated on router 1', 1, NULL, '{"rules_added": 3, "rules_modified": 1}'),
('sync_completed', 'info', 'Synchronization completed for router 4', 4, NULL, '{"duration": "2.3s", "items_synced": 20}'),
('ip_conflict', 'warning', 'IP address conflict detected', 1, 1, '{"conflicting_ip": "192.168.1.50", "devices": 2}');
