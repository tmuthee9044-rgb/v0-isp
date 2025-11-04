-- Fix customer_services start_date null constraint violation
-- Set default value for start_date column and update existing null values

-- First, update any existing null start_date values to current date
UPDATE customer_services 
SET start_date = CURRENT_DATE 
WHERE start_date IS NULL;

-- Add default value for future inserts
ALTER TABLE customer_services 
ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;

-- Verify the changes
SELECT COUNT(*) as null_start_dates 
FROM customer_services 
WHERE start_date IS NULL;
