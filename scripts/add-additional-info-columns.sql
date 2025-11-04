-- Add missing additional information columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS special_requirements TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_manager VARCHAR(100);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep ON customers(sales_rep);
CREATE INDEX IF NOT EXISTS idx_customers_account_manager ON customers(account_manager);

-- Add comments for documentation
COMMENT ON COLUMN customers.special_requirements IS 'Special requirements, accessibility needs, or important customer information';
COMMENT ON COLUMN customers.internal_notes IS 'Internal staff notes not visible to customer';
COMMENT ON COLUMN customers.sales_rep IS 'Sales representative assigned to this customer';
COMMENT ON COLUMN customers.account_manager IS 'Account manager assigned to this customer';
