-- Add Airtel Money Payment Gateway Configuration
-- This migration adds Airtel Money specific fields to the payment_gateway_configs table

-- Add Airtel Money specific columns to payment_gateway_configs
ALTER TABLE payment_gateway_configs 
ADD COLUMN IF NOT EXISTS airtel_environment VARCHAR(20) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS airtel_client_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtel_client_secret TEXT,
ADD COLUMN IF NOT EXISTS airtel_api_key TEXT,
ADD COLUMN IF NOT EXISTS airtel_merchant_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS airtel_merchant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtel_merchant_pin VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtel_callback_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS airtel_result_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS airtel_timeout_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS airtel_country_code VARCHAR(3) DEFAULT 'KE',
ADD COLUMN IF NOT EXISTS airtel_currency VARCHAR(3) DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS airtel_min_amount DECIMAL(10,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS airtel_max_amount DECIMAL(10,2) DEFAULT 500000.00,
ADD COLUMN IF NOT EXISTS airtel_transaction_fee DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS airtel_enable_auto_reconciliation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS airtel_enable_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS airtel_webhook_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS enable_airtel BOOLEAN DEFAULT false;

-- Create Airtel Money transaction logs table
CREATE TABLE IF NOT EXISTS airtel_transaction_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    airtel_reference VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, cancelled
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    callback_received BOOLEAN DEFAULT false,
    callback_data JSONB,
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for Airtel transaction logs
CREATE INDEX IF NOT EXISTS idx_airtel_logs_customer_id ON airtel_transaction_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_airtel_logs_payment_id ON airtel_transaction_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_airtel_logs_transaction_id ON airtel_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_airtel_logs_status ON airtel_transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_airtel_logs_created_at ON airtel_transaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_airtel_logs_reconciled ON airtel_transaction_logs(reconciled);

-- Insert default Airtel Money gateway configuration if not exists
INSERT INTO payment_gateway_configs (
    gateway_name,
    gateway_type,
    provider,
    supported_currencies,
    processing_fee_percent,
    processing_fee_fixed,
    airtel_environment,
    airtel_country_code,
    airtel_currency,
    airtel_min_amount,
    airtel_max_amount,
    enable_airtel
) VALUES (
    'Airtel Money',
    'airtel',
    'airtel_africa',
    ARRAY['KES', 'UGX', 'TZS', 'RWF', 'ZMW'],
    0.0,
    0.0,
    'production',
    'KE',
    'KES',
    10.00,
    500000.00,
    false
) ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_airtel_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_airtel_logs_timestamp
    BEFORE UPDATE ON airtel_transaction_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_airtel_logs_timestamp();

-- Record this migration
INSERT INTO schema_migrations (migration_name) 
VALUES ('160_add_airtel_payment_gateway.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Airtel Money payment gateway configuration added successfully!';
    RAISE NOTICE 'Created airtel_transaction_logs table with indexes';
    RAISE NOTICE 'Added Airtel-specific columns to payment_gateway_configs';
END $$;
