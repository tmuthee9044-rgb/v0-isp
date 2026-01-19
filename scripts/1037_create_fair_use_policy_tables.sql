-- Fair-Use Policy (FUP) Engine
-- Implements monthly data caps, burst logic, and throttling

-- Fair-use policy definitions
CREATE TABLE IF NOT EXISTS fair_use_policies (
  id SERIAL PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Monthly limits
  monthly_limit_gb INTEGER NOT NULL,
  soft_cap_gb INTEGER, -- Warning threshold (e.g., 80% of limit)
  
  -- Post-limit behavior
  post_limit_action VARCHAR(20) NOT NULL DEFAULT 'throttle', -- throttle, block, charge
  throttled_download_mbps INTEGER, -- Speed after limit
  throttled_upload_mbps INTEGER,
  overage_charge_per_gb DECIMAL(10, 2), -- Cost per GB over limit
  
  -- Burst allowance (temporary speed boost)
  burst_enabled BOOLEAN DEFAULT false,
  burst_download_mbps INTEGER,
  burst_upload_mbps INTEGER,
  burst_duration_minutes INTEGER DEFAULT 5,
  burst_cooldown_minutes INTEGER DEFAULT 60,
  
  -- Time-based exceptions (e.g., free data at night)
  free_hours VARCHAR(255), -- JSON: ["00:00-06:00"]
  free_days VARCHAR(255), -- JSON: ["saturday","sunday"]
  
  -- Grace period
  grace_period_days INTEGER DEFAULT 0, -- Days before enforcement starts
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer fair-use tracking (monthly usage vs limit)
CREATE TABLE IF NOT EXISTS customer_fair_use_tracking (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  policy_id INTEGER REFERENCES fair_use_policies(id),
  
  -- Tracking period
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  
  -- Usage
  total_mb DECIMAL(15, 2) DEFAULT 0,
  free_hours_mb DECIMAL(15, 2) DEFAULT 0, -- Usage during free hours
  billable_mb DECIMAL(15, 2) DEFAULT 0, -- Usage subject to FUP
  
  -- Status
  limit_reached BOOLEAN DEFAULT false,
  limit_reached_at TIMESTAMP,
  throttled BOOLEAN DEFAULT false,
  throttle_applied_at TIMESTAMP,
  
  -- Burst tracking
  burst_used_count INTEGER DEFAULT 0,
  last_burst_at TIMESTAMP,
  
  -- Overage charges
  overage_gb DECIMAL(10, 2) DEFAULT 0,
  overage_charges DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id, month)
);

-- Fair-use events log
CREATE TABLE IF NOT EXISTS fair_use_events (
  id SERIAL PRIMARY KEY,
  tracking_id INTEGER REFERENCES customer_fair_use_tracking(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- soft_cap_reached, limit_reached, throttled, burst_activated
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add fair_use_policy_id to service_plans
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS fair_use_policy_id INTEGER REFERENCES fair_use_policies(id);

-- Indexes
CREATE INDEX idx_fair_use_tracking_customer_month ON customer_fair_use_tracking(customer_id, month);
CREATE INDEX idx_fair_use_tracking_service ON customer_fair_use_tracking(service_id);
CREATE INDEX idx_fair_use_tracking_throttled ON customer_fair_use_tracking(throttled) WHERE throttled = true;
CREATE INDEX idx_fair_use_events_tracking ON fair_use_events(tracking_id);
CREATE INDEX idx_fair_use_events_type ON fair_use_events(event_type);

-- Insert default policies
INSERT INTO fair_use_policies (
  policy_name, monthly_limit_gb, soft_cap_gb, 
  post_limit_action, throttled_download_mbps, throttled_upload_mbps,
  burst_enabled, burst_download_mbps, burst_duration_minutes
) VALUES
  ('Unlimited', 999999, 999999, 'throttle', 50, 50, false, null, null),
  ('100GB Fair Use', 100, 80, 'throttle', 5, 2, true, 20, 5),
  ('200GB Fair Use', 200, 160, 'throttle', 10, 5, true, 30, 5),
  ('500GB Fair Use', 500, 400, 'throttle', 20, 10, true, 50, 10)
ON CONFLICT (policy_name) DO NOTHING;

COMMIT;
