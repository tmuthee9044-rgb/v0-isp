-- Add missing columns to customers table for Rule 11 compliance

-- Add columns if they don't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS school_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS student_count INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS staff_count INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_gps_coordinates VARCHAR(100);

-- Add indexes for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_company_size ON customers(company_size);
CREATE INDEX IF NOT EXISTS idx_customers_school_type ON customers(school_type);
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);

-- Update the schema file tracking
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('1003', 'Add missing customer columns for edit form rule 11 compliance', NOW())
ON CONFLICT DO NOTHING;
