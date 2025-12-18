-- Add missing columns to radius_users table to support full service plan integration
-- This ensures all service plan settings (burst speeds, FUP, QoS priority) are stored in RADIUS

ALTER TABLE radius_users 
ADD COLUMN IF NOT EXISTS burst_download INTEGER,
ADD COLUMN IF NOT EXISTS burst_upload INTEGER,
ADD COLUMN IF NOT EXISTS burst_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS fup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fup_limit INTEGER,
ADD COLUMN IF NOT EXISTS fup_speed INTEGER;

-- Add indexes for fast RADIUS authentication queries (Rule 6)
CREATE INDEX IF NOT EXISTS idx_radius_users_customer_id ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_service_id ON radius_users(service_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);

-- Add comment documenting RADIUS integration
COMMENT ON TABLE radius_users IS 'RADIUS users with full service plan integration including speeds, burst limits, FUP, and QoS priority levels';
