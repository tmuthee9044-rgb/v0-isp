-- Create table for per-interface traffic history
CREATE TABLE IF NOT EXISTS interface_traffic_history (
  id SERIAL PRIMARY KEY,
  router_id INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
  interface_name VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rx_bytes BIGINT DEFAULT 0,
  tx_bytes BIGINT DEFAULT 0,
  rx_packets BIGINT DEFAULT 0,
  tx_packets BIGINT DEFAULT 0,
  rx_errors INTEGER DEFAULT 0,
  tx_errors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_interface_traffic_router ON interface_traffic_history(router_id);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_timestamp ON interface_traffic_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_interface ON interface_traffic_history(interface_name);
CREATE INDEX IF NOT EXISTS idx_interface_traffic_router_time ON interface_traffic_history(router_id, timestamp DESC);

-- Add comment
COMMENT ON TABLE interface_traffic_history IS 'Historical traffic statistics per router interface/port';
