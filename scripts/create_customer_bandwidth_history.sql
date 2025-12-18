-- Create customer bandwidth history table for tracking live usage data
CREATE TABLE IF NOT EXISTS customer_bandwidth_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES customer_services(id) ON DELETE CASCADE,
  upload_mbps DECIMAL(10, 2) DEFAULT 0,
  download_mbps DECIMAL(10, 2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id, recorded_at)
);

-- Create indexes for fast queries (rule 6: load under 5ms)
CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_customer ON customer_bandwidth_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_service ON customer_bandwidth_history(service_id);
CREATE INDEX IF NOT EXISTS idx_customer_bandwidth_recorded ON customer_bandwidth_history(recorded_at);

-- Add cleanup function to retain only last 30 days of data
CREATE OR REPLACE FUNCTION cleanup_old_customer_bandwidth() 
RETURNS void AS $$
BEGIN
  DELETE FROM customer_bandwidth_history 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE customer_bandwidth_history IS 'Stores real-time bandwidth usage from MikroTik routers for customer statistics';
