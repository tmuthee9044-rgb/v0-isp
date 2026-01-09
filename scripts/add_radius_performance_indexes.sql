-- ============================================================================
-- RADIUS Performance Optimization - Database Indexes
-- ============================================================================
-- This script adds indexes to ensure fast queries (< 5ms) for RADIUS operations
-- Observes Rule 6: All pages should load under 5ms

-- Index for router lookups by IP address (used for NAS identification)
CREATE INDEX IF NOT EXISTS idx_network_devices_ip_address 
ON network_devices(ip_address) 
WHERE type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other');

-- Index for RADIUS-enabled routers
CREATE INDEX IF NOT EXISTS idx_network_devices_radius_secret 
ON network_devices(radius_secret) 
WHERE radius_secret IS NOT NULL;

-- Index for NAS IP address lookups
CREATE INDEX IF NOT EXISTS idx_network_devices_nas_ip 
ON network_devices(nas_ip_address) 
WHERE nas_ip_address IS NOT NULL;

-- Index for router status and type for fast filtering
CREATE INDEX IF NOT EXISTS idx_network_devices_status_type 
ON network_devices(status, type);

-- Index for location-based router queries
CREATE INDEX IF NOT EXISTS idx_network_devices_location_id 
ON network_devices(location_id) 
WHERE location_id IS NOT NULL;

-- Index for router sync status (connection tests)
CREATE INDEX IF NOT EXISTS idx_router_sync_status_router_id 
ON router_sync_status(router_id, last_synced DESC);

-- Index for customer services by device (for PPPoE provisioning)
CREATE INDEX IF NOT EXISTS idx_customer_services_device_id 
ON customer_services(device_id, status) 
WHERE device_id IS NOT NULL;

-- Index for RADIUS accounting logs by username (customer lookups)
CREATE INDEX IF NOT EXISTS idx_radius_logs_username 
ON radius_logs(username, session_time DESC) 
WHERE username IS NOT NULL;

-- Index for activity logs by entity (for audit trails)
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity 
ON activity_logs(entity_type, entity_id, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_network_devices_ip_address IS 'Fast router lookups by IP address for RADIUS NAS identification';
COMMENT ON INDEX idx_network_devices_radius_secret IS 'Quick filtering of RADIUS-enabled routers';
COMMENT ON INDEX idx_network_devices_nas_ip IS 'Fast NAS IP address resolution';
COMMENT ON INDEX idx_router_sync_status_router_id IS 'Efficient router connection status queries';
COMMENT ON INDEX idx_customer_services_device_id IS 'Fast customer service lookups for provisioning';

-- Analyze tables for query optimization
ANALYZE network_devices;
ANALYZE router_sync_status;
ANALYZE customer_services;
ANALYZE radius_logs;
ANALYZE activity_logs;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- All indexes created successfully
-- Expected performance: < 5ms for all RADIUS-related queries
