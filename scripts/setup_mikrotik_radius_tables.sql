-- Consolidated migration for MikroTik Router Integration and RADIUS features
-- This script creates all required tables for router monitoring, traffic history, and customer bandwidth tracking

-- 1. Create router_traffic_history table (for interface traffic graphs)
CREATE TABLE IF NOT EXISTS router_traffic_history (
  id SERIAL PRIMARY KEY,
  router_id INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
  interface_name VARCHAR(100) NOT NULL,
  rx_bps BIGINT NOT NULL DEFAULT 0,
  tx_bps BIGINT NOT NULL DEFAULT 0,
  rx_pps INTEGER NOT NULL DEFAULT 0,
  tx_pps INTEGER NOT NULL DEFAULT 0,
  rx_bytes BIGINT NOT NULL DEFAULT 0,
  tx_bytes BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create customer_bandwidth_history table (for customer statistics)
CREATE TABLE IF NOT EXISTS customer_bandwidth_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES customer_services(id) ON DELETE CASCADE,
  upload_mbps DECIMAL(10, 2) DEFAULT 0,
  download_mbps DECIMAL(10, 2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id, recorded_at)
);

-- 3. Add provisioning columns to customer_services (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customer_services' AND column_name = 'provisioned_to_router') THEN
    ALTER TABLE customer_services ADD COLUMN provisioned_to_router BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customer_services' AND column_name = 'last_provisioned_at') THEN
    ALTER TABLE customer_services ADD COLUMN last_provisioned_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customer_services' AND column_name = 'provisioning_error') THEN
    ALTER TABLE customer_services ADD COLUMN provisioning_error TEXT;
  END IF;
END $$;

-- 4. Add unique constraint to router_sync_status (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'router_sync_status_router_id_key') THEN
    ALTER TABLE router_sync_status ADD CONSTRAINT router_sync_status_router_id_key UNIQUE (router_id);
  END IF;
END $$;

-- 5. Create indexes for fast queries (Rule 6: load under 5ms)

-- Router traffic history indexes
CREATE INDEX IF NOT EXISTS idx_traffic_history_router_time 
  ON router_traffic_history(router_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_history_interface 
  ON router_traffic_history(router_id, interface_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_history_cleanup 
  ON router_traffic_history(recorded_at);

-- Customer bandwidth history indexes
CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_customer 
  ON customer_bandwidth_history(customer_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_service 
  ON customer_bandwidth_history(service_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_cleanup 
  ON customer_bandwidth_history(recorded_at);

-- RADIUS performance indexes
CREATE INDEX IF NOT EXISTS idx_routers_radius_secret 
  ON network_devices(radius_secret) WHERE radius_secret IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_routers_nas_ip 
  ON network_devices(nas_ip_address) WHERE nas_ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_services_provisioned 
  ON customer_services(provisioned_to_router, last_provisioned_at);

-- 6. Add automatic cleanup triggers (30-day retention)

-- Cleanup old router traffic history
CREATE OR REPLACE FUNCTION cleanup_old_traffic_history()
RETURNS trigger AS $$
BEGIN
  DELETE FROM router_traffic_history 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_traffic_history ON router_traffic_history;
CREATE TRIGGER trigger_cleanup_traffic_history
  AFTER INSERT ON router_traffic_history
  EXECUTE FUNCTION cleanup_old_traffic_history();

-- Cleanup old customer bandwidth history
CREATE OR REPLACE FUNCTION cleanup_old_customer_bandwidth()
RETURNS trigger AS $$
BEGIN
  DELETE FROM customer_bandwidth_history 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_customer_bandwidth ON customer_bandwidth_history;
CREATE TRIGGER trigger_cleanup_customer_bandwidth
  AFTER INSERT ON customer_bandwidth_history
  EXECUTE FUNCTION cleanup_old_customer_bandwidth();

-- 7. Add helpful comments
COMMENT ON TABLE router_traffic_history IS 'Stores real-time traffic data from MikroTik routers for interface graphs';
COMMENT ON TABLE customer_bandwidth_history IS 'Stores real-time bandwidth usage from MikroTik routers for customer statistics';

-- Migration complete
SELECT 'MikroTik Router Integration and RADIUS tables created successfully!' AS status;
