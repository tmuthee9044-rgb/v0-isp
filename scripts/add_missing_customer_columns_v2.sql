-- Add missing columns to customers table for full form support
-- This script adds all columns that the customer add form collects

-- Basic information columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);

-- Contact columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_office VARCHAR(20);

-- Emergency contact
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50);

-- Address columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);

-- Billing address columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100);

-- Location and network
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Business information
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_reg_no VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_pin VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);

-- Account management
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_manager VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Billing preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(last_name);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_primary ON customers(phone_primary);
CREATE INDEX IF NOT EXISTS idx_customers_alternate_email ON customers(alternate_email);

-- Update existing customers to have default values
UPDATE customers SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;
UPDATE customers SET auto_renewal = true WHERE auto_renewal IS NULL;
UPDATE customers SET paperless_billing = false WHERE paperless_billing IS NULL;
UPDATE customers SET sms_notifications = true WHERE sms_notifications IS NULL;
UPDATE customers SET physical_country = 'Kenya' WHERE physical_country IS NULL;

ANALYZE customers;
