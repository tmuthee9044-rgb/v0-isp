-- Add all missing customer columns that the form collects
-- Run this script immediately to fix the "alternate_email does not exist" error

-- Contact Information
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(50);

-- Personal Information
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);

-- Physical Address (with physical_ prefix as form sends)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_gps_coordinates VARCHAR(100);

-- Billing Address
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100);

-- Emergency Contact
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);

-- Business Information
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);

-- Network Assignment
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Sales & Marketing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(100);

-- Billing Preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

-- Notes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_primary ON customers(phone_primary);
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep ON customers(sales_rep);

-- Analyze the table for query optimization
ANALYZE customers;
