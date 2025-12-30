-- Add missing employee_name column to payroll_records table
-- This is a safe migration that preserves existing data

ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);

-- Update existing records to populate employee_name from employees table
UPDATE payroll_records pr
SET employee_name = e.first_name || ' ' || e.last_name
FROM employees e
WHERE pr.employee_id = e.id
AND pr.employee_name IS NULL;

-- Add comment
COMMENT ON COLUMN payroll_records.employee_name IS 'Employee full name for quick reference';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payroll_records' 
AND column_name = 'employee_name';
