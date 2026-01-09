-- Router health check logging table
CREATE TABLE IF NOT EXISTS router_health_logs (
  id SERIAL PRIMARY KEY,
  router_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  latency_ms INTEGER,
  cpu_usage INTEGER,
  memory_usage INTEGER,
  active_sessions INTEGER,
  uptime INTEGER,
  issues JSONB,
  checked_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_router_health_logs_router_id ON router_health_logs(router_id);
CREATE INDEX IF NOT EXISTS idx_router_health_logs_checked_at ON router_health_logs(checked_at DESC);

-- Add authentication_mode column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS authentication_mode VARCHAR(20) DEFAULT 'radius_only';

COMMENT ON COLUMN network_devices.authentication_mode IS 'Router authentication mode: radius_only (default), direct_push, or hybrid';
