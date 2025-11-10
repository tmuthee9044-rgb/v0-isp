-- Adding customer_type column to customers table
ALTER TABLE customers 
ADD COLUMN customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'company', 'school'));

-- Update existing records to have default customer_type
UPDATE customers 
SET customer_type = 'individual' 
WHERE customer_type IS NULL;

-- Add index for better query performance
CREATE INDEX idx_customers_customer_type ON customers(customer_type);
