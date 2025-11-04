-- Add missing date_of_birth column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add missing gender column for individual customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender CHARACTER VARYING(20);

-- Add missing contact_person column for business customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person CHARACTER VARYING(255);

-- Add missing alternate_email column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email CHARACTER VARYING(255);

-- Add missing billing coordinates columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_gps_coordinates CHARACTER VARYING(100);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_date_of_birth ON customers(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_customers_gender ON customers(gender);
CREATE INDEX IF NOT EXISTS idx_customers_alternate_email ON customers(alternate_email);

-- Add comments for documentation
COMMENT ON COLUMN customers.date_of_birth IS 'Date of birth for individual customers';
COMMENT ON COLUMN customers.gender IS 'Gender for individual customers';
COMMENT ON COLUMN customers.contact_person IS 'Primary contact person for business/school customers';
COMMENT ON COLUMN customers.alternate_email IS 'Secondary email address';
COMMENT ON COLUMN customers.billing_gps_coordinates IS 'GPS coordinates for billing address';
