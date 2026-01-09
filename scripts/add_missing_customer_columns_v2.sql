-- Add missing columns to customers table for full form support
-- This script adds all columns that the customer add form collects

-- Basic information columns (these may already exist in base schema)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- ID/Tax columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);

-- Contact person for businesses
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);

-- Address columns (base names used by API)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);

-- Billing and installation addresses
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_address TEXT;

-- Location and network
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Contact preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'phone';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);

-- Service preferences (stored as JSON)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_preferences JSONB;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(last_name);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_alternate_email ON customers(alternate_email);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(state);

-- Update existing customers to have default values
UPDATE customers SET country = 'Kenya' WHERE country IS NULL;
UPDATE customers SET preferred_contact_method = 'phone' WHERE preferred_contact_method IS NULL;

ANALYZE customers;
