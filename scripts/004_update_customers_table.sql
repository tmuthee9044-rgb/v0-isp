-- Add missing columns to customers table to match application requirements
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS plan VARCHAR(100) DEFAULT 'Basic Plan',
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 2500.00,
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS connection_quality INTEGER DEFAULT 95,
ADD COLUMN IF NOT EXISTS data_usage VARCHAR(50) DEFAULT '0 GB',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'mpesa',
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS router_allocated VARCHAR(50) DEFAULT '192.168.1.1',
ADD COLUMN IF NOT EXISTS ip_allocated VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_payment TIMESTAMP,
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255),
ADD COLUMN IF NOT EXISTS portal_login_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
