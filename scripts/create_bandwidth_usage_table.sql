-- Create bandwidth_usage table for storing customer bandwidth statistics from physical routers
-- This table follows rule 9: customer statistics from physical router where IP terminates

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

-- Create indexes for fast queries (rule 6)
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_id ON bandwidth_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_device_id ON bandwidth_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_date_hour ON bandwidth_usage(date_hour);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_ip_address ON bandwidth_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer_date ON bandwidth_usage(customer_id, date_hour DESC);

COMMENT ON TABLE bandwidth_usage IS 'Stores hourly bandwidth usage statistics fetched from physical routers for historical analysis and billing';
COMMENT ON COLUMN bandwidth_usage.customer_id IS 'Reference to the customer using the bandwidth';
COMMENT ON COLUMN bandwidth_usage.device_id IS 'Physical router where the customer IP terminates';
COMMENT ON COLUMN bandwidth_usage.ip_address IS 'Customer IP address on the physical router';
COMMENT ON COLUMN bandwidth_usage.date_hour IS 'Hour timestamp for the bandwidth measurement';
COMMENT ON COLUMN bandwidth_usage.bytes_in IS 'Bytes received by customer (download)';
COMMENT ON COLUMN bandwidth_usage.bytes_out IS 'Bytes sent by customer (upload)';
