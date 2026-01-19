-- Fix payroll_records employee_id column type from UUID to INTEGER
-- This migration converts the existing UUID column to INTEGER and ensures foreign key references work

ALTER TABLE payroll_records 
  DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;

-- Drop and recreate the column with correct type
ALTER TABLE payroll_records 
  DROP COLUMN employee_id CASCADE;

ALTER TABLE payroll_records 
  ADD COLUMN employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE;

-- Create unique constraint for ON CONFLICT
ALTER TABLE payroll_records
  ADD CONSTRAINT payroll_records_employee_pay_period_unique 
  UNIQUE (employee_id, pay_period_start);
