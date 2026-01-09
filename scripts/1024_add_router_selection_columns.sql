-- Add router-aware columns to customer_services table
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'pppoe';
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'radius';

-- Add router capabilities to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS vendor VARCHAR(20);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS supports_radius BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS supports_direct_push BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS max_sessions INTEGER DEFAULT 10000;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS current_sessions INTEGER DEFAULT 0;

-- Create service provisioning log table
CREATE TABLE IF NOT EXISTS service_provisioning_log (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  router_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
  action VARCHAR(50), -- CREATE | UPDATE | DELETE | SUSPEND | RESUME
  enforcement_mode VARCHAR(20),
  status VARCHAR(50), -- pending | success | failed | retrying
  attempt_count INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_provisioning_log_service_id ON service_provisioning_log(service_id);
CREATE INDEX IF NOT EXISTS idx_service_provisioning_log_status ON service_provisioning_log(status);

-- Update 000_complete_schema.sql reference
COMMENT ON TABLE service_provisioning_log IS 'Tracks async router provisioning jobs per the Router Selection Workflow';
