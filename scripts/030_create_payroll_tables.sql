-- Create payroll_records table
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
    overtime DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    paye DECIMAL(12,2) NOT NULL DEFAULT 0,
    nssf DECIMAL(12,2) NOT NULL DEFAULT 0,
    sha DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processed_by VARCHAR(100),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(employee_id, period),
    CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
    CHECK (gross_pay >= 0),
    CHECK (net_pay >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period);
CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_processed_at ON payroll_records(processed_at);

-- Create payroll_settings table for tax rates and configurations
CREATE TABLE IF NOT EXISTS payroll_settings (
    id SERIAL PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payroll settings
INSERT INTO payroll_settings (setting_name, setting_value, description) VALUES
('paye_brackets', '[
    {"min": 0, "max": 24000, "rate": 0.10, "relief": 2400},
    {"min": 24001, "max": 32333, "rate": 0.25, "relief": 2400},
    {"min": 32334, "max": 500000, "rate": 0.30, "relief": 2400},
    {"min": 500001, "max": 800000, "rate": 0.325, "relief": 2400},
    {"min": 800001, "max": null, "rate": 0.35, "relief": 2400}
]', 'PAYE tax brackets for 2024'),

('nssf_rates', '{
    "tier1_limit": 18000,
    "tier2_limit": 18000,
    "employee_rate": 0.06,
    "employer_rate": 0.06
}', 'NSSF contribution rates'),

('sha_rates', '[
    {"min": 0, "max": 5999, "amount": 150},
    {"min": 6000, "max": 7999, "amount": 300},
    {"min": 8000, "max": 11999, "amount": 400},
    {"min": 12000, "max": 14999, "amount": 500},
    {"min": 15000, "max": 19999, "amount": 600},
    {"min": 20000, "max": 24999, "amount": 750},
    {"min": 25000, "max": 29999, "amount": 850},
    {"min": 30000, "max": 34999, "amount": 900},
    {"min": 35000, "max": 39999, "amount": 950},
    {"min": 40000, "max": 44999, "amount": 1000},
    {"min": 45000, "max": 49999, "amount": 1100},
    {"min": 50000, "max": 59999, "amount": 1200},
    {"min": 60000, "max": 69999, "amount": 1300},
    {"min": 70000, "max": 79999, "amount": 1400},
    {"min": 80000, "max": 89999, "amount": 1500},
    {"min": 90000, "max": 99999, "amount": 1600},
    {"min": 100000, "max": null, "rate": 0.0275}
]', 'SHA contribution rates for 2024');

-- Insert sample payroll records for testing
INSERT INTO payroll_records (
    employee_id, employee_name, period, basic_salary, allowances, overtime,
    gross_pay, paye, nssf, sha, other_deductions, total_deductions, net_pay, status
) VALUES
('EMP001', 'John Smith', '2024-01', 85000, 15000, 5000, 105000, 15750, 6300, 2750, 0, 24800, 80200, 'processed'),
('EMP002', 'Sarah Johnson', '2024-01', 65000, 10000, 2000, 77000, 11550, 4620, 2750, 0, 18920, 58080, 'processed'),
('EMP003', 'Mike Wilson', '2024-01', 75000, 12000, 0, 87000, 13050, 5220, 2750, 0, 21020, 65980, 'processed'),
('EMP004', 'Grace Wanjiku', '2024-01', 55000, 8000, 1000, 64000, 9600, 3840, 2750, 0, 16190, 47810, 'processed');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payroll_records_updated_at 
    BEFORE UPDATE ON payroll_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_settings_updated_at 
    BEFORE UPDATE ON payroll_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
