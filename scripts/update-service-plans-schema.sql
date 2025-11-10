-- Adding comprehensive columns to service_plans table for all service configuration data
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS download_speed INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS upload_speed INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS guaranteed_download INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS guaranteed_upload INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_download INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_upload INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS burst_duration INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS aggregation_ratio INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS contract_length VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS promo_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS promo_duration VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT FALSE;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS fup_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS data_limit VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS limit_type VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS action_after_limit VARCHAR(20);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS throttle_speed INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS reset_day VARCHAR(5);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS warning_threshold INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS qos_config JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS restrictions JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for better performance on service type queries
CREATE INDEX IF NOT EXISTS idx_service_plans_type ON service_plans(service_type);
CREATE INDEX IF NOT EXISTS idx_service_plans_status ON service_plans(status);
