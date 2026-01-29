-- Final fix for payroll_records table and employees table
-- This ensures the schema matches what hr-actions.ts expects
-- employee_id is VARCHAR(50) to match employees.employee_id (e.g., "EMP001")

-- First, ensure employees table has all required columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2) DEFAULT 0.00;

-- Drop and recreate payroll_records table with correct types
DROP TABLE IF EXISTS payroll_records CASCADE;

CREATE TABLE payroll_records (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(255),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  allowances DECIMAL(12, 2) DEFAULT 0.00,
  deductions DECIMAL(12, 2) DEFAULT 0.00,
  gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0.00,
  nhif DECIMAL(12, 2) DEFAULT 0.00,
  nssf DECIMAL(12, 2) DEFAULT 0.00,
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, pay_period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(pay_period_start);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);

-- Verify the tables were created/updated correctly
SELECT 'employees' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name IN ('employee_id', 'salary', 'allowances', 'first_name', 'last_name', 'status')
UNION ALL
SELECT 'payroll_records' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payroll_records' 
ORDER BY table_name, column_name;
