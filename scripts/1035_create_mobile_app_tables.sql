-- Mobile App Customer Portal Tables
-- Supports self-service usage monitoring, parental controls, payments, and multi-service management

-- Customer app sessions (JWT tokens, push notification tokens)
CREATE TABLE IF NOT EXISTS customer_app_sessions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_type VARCHAR(50), -- ios, android, web
  device_name VARCHAR(255),
  fcm_token VARCHAR(255), -- Firebase Cloud Messaging for push notifications
  jwt_token_hash VARCHAR(255), -- Hashed JWT for security
  ip_address INET,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(customer_id, device_id)
);

-- Customer usage history (cached for quick mobile access)
CREATE TABLE IF NOT EXISTS customer_usage_cache (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  upload_mb DECIMAL(15, 2) DEFAULT 0,
  download_mb DECIMAL(15, 2) DEFAULT 0,
  total_mb DECIMAL(15, 2) DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  peak_speed_mbps DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id, date)
);

-- Customer parental control profiles (managed from mobile app)
CREATE TABLE IF NOT EXISTS parental_control_profiles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  profile_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  
  -- Time restrictions
  allowed_hours VARCHAR(255), -- JSON array: ["08:00-20:00"]
  allowed_days VARCHAR(255), -- JSON array: ["monday","tuesday",...]
  
  -- Content filtering
  block_adult BOOLEAN DEFAULT false,
  block_social BOOLEAN DEFAULT false,
  block_gaming BOOLEAN DEFAULT false,
  block_streaming BOOLEAN DEFAULT false,
  custom_blocked_domains TEXT, -- Comma-separated
  custom_allowed_domains TEXT, -- Whitelist
  
  -- Speed limits
  max_download_mbps INTEGER,
  max_upload_mbps INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer payment methods (for mobile app payments)
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL, -- mpesa, card, bank
  is_default BOOLEAN DEFAULT false,
  
  -- MPESA
  mpesa_phone VARCHAR(20),
  
  -- Card (tokenized)
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  card_token VARCHAR(255), -- Payment gateway token
  
  -- Bank
  bank_name VARCHAR(100),
  account_number_encrypted VARCHAR(255),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer notifications (push notifications history)
CREATE TABLE IF NOT EXISTS customer_notifications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- payment_due, service_suspended, usage_alert, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional payload
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_app_sessions_customer ON customer_app_sessions(customer_id);
CREATE INDEX idx_app_sessions_expires ON customer_app_sessions(expires_at);
CREATE INDEX idx_usage_cache_customer_date ON customer_usage_cache(customer_id, date DESC);
CREATE INDEX idx_usage_cache_service ON customer_usage_cache(service_id);
CREATE INDEX idx_parental_profiles_customer ON parental_control_profiles(customer_id);
CREATE INDEX idx_parental_profiles_service ON parental_control_profiles(service_id);
CREATE INDEX idx_payment_methods_customer ON customer_payment_methods(customer_id);
CREATE INDEX idx_notifications_customer ON customer_notifications(customer_id, sent_at DESC);
CREATE INDEX idx_notifications_unread ON customer_notifications(customer_id, is_read) WHERE is_read = false;

COMMIT;
