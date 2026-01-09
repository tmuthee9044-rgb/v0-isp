-- Provisioning Queue for async router operations
-- Used for Ubiquiti and Juniper routers that require SSH/NETCONF

CREATE TABLE IF NOT EXISTS provisioning_queue (
  id SERIAL PRIMARY KEY,
  router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  username VARCHAR(255),
  password TEXT,
  static_ip INET,
  profile VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provisioning_queue_status ON provisioning_queue(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_router ON provisioning_queue(router_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_created ON provisioning_queue(created_at);

-- Add vendor_map column to service_plans for storing vendor-specific RADIUS attributes
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS vendor_map JSONB DEFAULT '{}';

COMMENT ON COLUMN service_plans.vendor_map IS 'Vendor-specific RADIUS attributes (MikroTik-Rate-Limit, ERX-Ingress-Policy-Name, etc)';
COMMENT ON TABLE provisioning_queue IS 'Queue for async router provisioning operations (Ubiquiti/Juniper SSH/NETCONF)';
