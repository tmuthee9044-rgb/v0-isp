-- Create table for storing router interface traffic history
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

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_traffic_history_router_time 
  ON router_traffic_history(router_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_history_interface 
  ON router_traffic_history(router_id, interface_name, recorded_at DESC);

-- Add retention policy - keep only last 30 days of data
CREATE INDEX IF NOT EXISTS idx_traffic_history_cleanup 
  ON router_traffic_history(recorded_at);

-- Optional: Add a trigger to clean up old data automatically
CREATE OR REPLACE FUNCTION cleanup_old_traffic_history()
RETURNS trigger AS $$
BEGIN
  DELETE FROM router_traffic_history 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_traffic_history
  AFTER INSERT ON router_traffic_history
  EXECUTE FUNCTION cleanup_old_traffic_history();

COMMENT ON TABLE router_traffic_history IS 'Stores historical traffic data from MikroTik routers for graphing and analysis';
