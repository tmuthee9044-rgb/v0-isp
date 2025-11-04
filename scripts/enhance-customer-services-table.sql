-- Adding missing columns to customer_services table for proper service management
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS installation_date DATE,
ADD COLUMN IF NOT EXISTS next_billing_date DATE,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS router_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS contract_length INTEGER, -- in months
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_billing_date DATE,
ADD COLUMN IF NOT EXISTS data_usage_gb DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed_test_results JSONB,
ADD COLUMN IF NOT EXISTS equipment_assigned JSONB,
ADD COLUMN IF NOT EXISTS service_location TEXT,
ADD COLUMN IF NOT EXISTS technical_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Adding indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_next_billing ON customer_services(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);

-- Adding trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customer_services_updated_at ON customer_services;
CREATE TRIGGER trigger_customer_services_updated_at
    BEFORE UPDATE ON customer_services
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_services_updated_at();

-- Adding sample data for testing
INSERT INTO customer_services (
    customer_id, service_plan_id, status, monthly_fee, start_date, 
    installation_date, next_billing_date, auto_renewal, contract_length,
    contract_start_date, notes
) VALUES 
(1, 1, 'active', 2500.00, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', true, 12, CURRENT_DATE, 'Initial service setup'),
(2, 2, 'active', 3500.00, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', true, 6, CURRENT_DATE - INTERVAL '15 days', 'Premium package'),
(3, 1, 'suspended', 2500.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, false, 12, CURRENT_DATE - INTERVAL '30 days', 'Suspended due to non-payment')
ON CONFLICT DO NOTHING;

-- Adding comments for documentation
COMMENT ON COLUMN customer_services.installation_date IS 'Date when service was physically installed';
COMMENT ON COLUMN customer_services.next_billing_date IS 'Next billing cycle date';
COMMENT ON COLUMN customer_services.ip_address IS 'Assigned IP address for the service';
COMMENT ON COLUMN customer_services.router_id IS 'Router or equipment identifier';
COMMENT ON COLUMN customer_services.auto_renewal IS 'Whether service auto-renews';
COMMENT ON COLUMN customer_services.suspension_reason IS 'Reason for service suspension';
COMMENT ON COLUMN customer_services.equipment_assigned IS 'JSON array of assigned equipment';
COMMENT ON COLUMN customer_services.speed_test_results IS 'JSON object storing speed test history';
