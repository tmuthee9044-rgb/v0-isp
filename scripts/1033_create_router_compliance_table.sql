-- Create router compliance tracking table
CREATE TABLE IF NOT EXISTS router_compliance_history (
  id SERIAL PRIMARY KEY,
  router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
  overall_status VARCHAR(20) NOT NULL,
  radius_auth BOOLEAN NOT NULL DEFAULT false,
  radius_acct BOOLEAN NOT NULL DEFAULT false,
  radius_coa BOOLEAN NOT NULL DEFAULT false,
  interim_updates BOOLEAN NOT NULL DEFAULT false,
  dns_ok BOOLEAN NOT NULL DEFAULT false,
  fasttrack_safe BOOLEAN NOT NULL DEFAULT false,
  security_hardened BOOLEAN NOT NULL DEFAULT false,
  issues TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_router_compliance_router ON router_compliance_history(router_id);
CREATE INDEX IF NOT EXISTS idx_router_compliance_status ON router_compliance_history(overall_status);
CREATE INDEX IF NOT EXISTS idx_router_compliance_checked ON router_compliance_history(checked_at DESC);

-- Add compliance tracking columns to routers table
ALTER TABLE routers ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_compliance_check TIMESTAMP;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Add secondary RADIUS server columns for failover (ZERO-DOWNTIME REQUIREMENT)
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_server_secondary VARCHAR(100);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret_secondary VARCHAR(255);

COMMENT ON TABLE router_compliance_history IS 'Tracks router compliance with ISP carrier-grade standards';
COMMENT ON COLUMN routers.radius_server_secondary IS 'Secondary RADIUS server for failover - prevents mass disconnections';
