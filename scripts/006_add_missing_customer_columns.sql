-- Add missing columns to customers table
-- This script adds all the columns that the customer actions expect

BEGIN;

-- Add customer_type column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'residential';

-- Add plan column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS plan VARCHAR(100);

-- Add monthly_fee column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0.00;

-- Add balance column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00;

-- Add connection_quality column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS connection_quality VARCHAR(20) DEFAULT 'good';

-- Add portal login credentials
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS portal_login_id VARCHAR(100);

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100);

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255);

-- Add installation date
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS installation_date DATE;

-- Add last payment date
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add notes column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan);
CREATE INDEX IF NOT EXISTS idx_customers_portal_username ON customers(portal_username);

-- Update existing customers with default values
UPDATE customers 
SET 
    customer_type = 'residential',
    connection_quality = 'good',
    balance = 0.00,
    monthly_fee = 0.00
WHERE customer_type IS NULL;

COMMIT;
