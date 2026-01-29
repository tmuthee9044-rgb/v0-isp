-- Migration: Fix payroll_records.employee_id to match employees.employee_id type (VARCHAR)
-- The employee_id column was incorrectly set as UUID, but employees.employee_id is VARCHAR(50)
-- This migration corrects the type mismatch

-- Drop existing constraints that reference employee_id
ALTER TABLE payroll_records 
  DROP CONSTRAINT IF EXISTS payroll_records_employee_pay_period_unique;

ALTER TABLE payroll_records 
  DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;

-- Recreate the table with correct column types
DROP TABLE IF EXISTS payroll_records CASCADE;

CREATE TABLE payroll_records (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,  -- Matches employees.employee_id type
  employee_name VARCHAR(255),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  allowances DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  nhif DECIMAL(12, 2) DEFAULT 0,
  nssf DECIMAL(12, 2) DEFAULT 0,
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, pay_period_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_payroll_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_records_updated_at ON payroll_records;
CREATE TRIGGER trigger_payroll_records_updated_at
    BEFORE UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_records_updated_at();

-- Record migration
INSERT INTO schema_migrations (migration_name) 
VALUES ('1033_fix_payroll_employee_id_to_varchar')
ON CONFLICT (migration_name) DO NOTHING;
