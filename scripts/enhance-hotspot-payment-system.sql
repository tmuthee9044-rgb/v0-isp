-- Add payment integration columns to hotspot vouchers table
ALTER TABLE hotspot_vouchers ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
ALTER TABLE hotspot_vouchers ADD COLUMN IF NOT EXISTS guest_customer_id INTEGER REFERENCES customers(id);
ALTER TABLE hotspot_vouchers ADD COLUMN IF NOT EXISTS package_type VARCHAR(100);
ALTER TABLE hotspot_vouchers ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);

-- Add guest customer type to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual';

-- Create hotspot payment packages table
CREATE TABLE IF NOT EXISTS hotspot_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit INTEGER NOT NULL, -- in minutes
    data_limit INTEGER NOT NULL, -- in MB
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KES',
    is_popular BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default hotspot packages
INSERT INTO hotspot_packages (name, description, time_limit, data_limit, price, is_popular) VALUES
('Basic 1 Hour', 'Perfect for quick browsing and social media', 60, 500, 50.00, FALSE),
('Standard 3 Hours', 'Great for work and streaming', 180, 1500, 120.00, TRUE),
('Premium 6 Hours', 'Extended access for heavy usage', 360, 3000, 200.00, FALSE),
('Daily Pass', 'Full day unlimited access', 1440, 5000, 350.00, FALSE)
ON CONFLICT DO NOTHING;

-- Create hotspot payment transactions table for tracking
CREATE TABLE IF NOT EXISTS hotspot_payment_transactions (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) REFERENCES payments(id),
    hotspot_id INTEGER REFERENCES hotspots(id),
    voucher_id INTEGER REFERENCES hotspot_vouchers(id),
    package_id INTEGER REFERENCES hotspot_packages(id),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotspot_vouchers_payment_id ON hotspot_vouchers(payment_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_payment_transactions_payment_id ON hotspot_payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_payment_transactions_status ON hotspot_payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- Update existing vouchers table to support payment integration
UPDATE hotspot_vouchers SET package_type = 'manual' WHERE package_type IS NULL;
