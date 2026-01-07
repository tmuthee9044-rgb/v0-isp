-- Add missing customer form fields per rule 11

-- Business fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);

-- School fields  
ALTER TABLE customers ADD COLUMN IF NOT EXISTS school_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS student_count INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS staff_count INTEGER;

-- Billing address postal code
-- Already exists as billing_postal_code

-- Technical fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS equipment_needed TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact_phone VARCHAR(50);

-- Sales fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_manager VARCHAR(255);

-- Add indexes for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_company_size ON customers(company_size);
CREATE INDEX IF NOT EXISTS idx_customers_school_type ON customers(school_type);
CREATE INDEX IF NOT EXISTS idx_customers_connection_type ON customers(connection_type);
CREATE INDEX IF NOT EXISTS idx_customers_account_manager ON customers(account_manager);
