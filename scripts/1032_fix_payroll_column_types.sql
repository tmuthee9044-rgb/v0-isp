-- Fix payroll_records column type mismatches
-- employee_name should be VARCHAR, not NUMERIC

-- Drop the table and recreate with correct types
DROP TABLE IF EXISTS payroll_records CASCADE;

CREATE TABLE IF NOT EXISTS payroll_records (
  id SERIAL PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary DECIMAL(10, 2) NOT NULL,
  allowances DECIMAL(10, 2) DEFAULT 0.00,
  deductions DECIMAL(10, 2) DEFAULT 0.00,
  gross_pay DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  nhif DECIMAL(10, 2) DEFAULT 0.00,
  nssf DECIMAL(10, 2) DEFAULT 0.00,
  net_pay DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, pay_period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);
