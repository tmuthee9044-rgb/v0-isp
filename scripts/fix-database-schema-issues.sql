-- Fix missing columns in database tables

-- 1. Add last_updated column to account_balances table
ALTER TABLE account_balances 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add updated_at column to customer_services table  
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Add updated_at column to customers table if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Create triggers to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need automatic timestamp updates
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_services_updated_at ON customer_services;
CREATE TRIGGER update_customer_services_updated_at 
    BEFORE UPDATE ON customer_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_balances_last_updated ON account_balances;
CREATE TRIGGER update_account_balances_last_updated 
    BEFORE UPDATE ON account_balances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
