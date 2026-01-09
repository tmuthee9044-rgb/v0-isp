-- Update bandwidth_usage table to match the actual schema
-- This ensures compatibility with the ISP system

-- Check if bandwidth_usage table exists and create if not
CREATE TABLE IF NOT EXISTS bandwidth_usage (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
    ip_address INET,
    date_hour TIMESTAMP NOT NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_bandwidth_entry UNIQUE(customer_id, device_id, ip_address, date_hour)
);

-- Create indexes for fast queries (Rule 6)
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_id ON bandwidth_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_device_id ON bandwidth_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_date_hour ON bandwidth_usage(date_hour);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_ip_address ON bandwidth_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_date ON bandwidth_usage(customer_id, date_hour);

-- Add comment
COMMENT ON TABLE bandwidth_usage IS 'Stores hourly bandwidth usage statistics fetched from physical routers for historical analysis and billing';
