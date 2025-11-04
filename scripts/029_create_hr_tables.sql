-- Create HR-related tables for the ISP system

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    marital_status VARCHAR(20),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    
    -- Employment Details
    position VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    reporting_manager VARCHAR(100),
    employment_type VARCHAR(20) NOT NULL DEFAULT 'full-time',
    contract_type VARCHAR(20) NOT NULL DEFAULT 'permanent',
    start_date DATE NOT NULL,
    probation_period INTEGER DEFAULT 0,
    work_location VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Compensation
    basic_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) DEFAULT 0,
    benefits TEXT,
    payroll_frequency VARCHAR(20) DEFAULT 'monthly',
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    
    -- Statutory Information
    kra_pin VARCHAR(20) UNIQUE NOT NULL,
    nssf_number VARCHAR(20) UNIQUE NOT NULL,
    sha_number VARCHAR(20) UNIQUE NOT NULL, -- Changed from nhif_number
    
    -- Portal Access
    portal_username VARCHAR(50) UNIQUE,
    portal_password VARCHAR(255),
    
    -- Leave Management
    leave_balance INTEGER DEFAULT 21,
    sick_leave_balance INTEGER DEFAULT 30,
    
    -- Performance
    performance_rating VARCHAR(20) DEFAULT 'satisfactory',
    
    -- Additional Information
    qualifications TEXT,
    experience TEXT,
    skills TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    leave_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Payroll records table
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    basic_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) DEFAULT 0,
    overtime DECIMAL(12,2) DEFAULT 0,
    gross_pay DECIMAL(12,2) NOT NULL,
    paye DECIMAL(12,2) NOT NULL,
    nssf DECIMAL(12,2) NOT NULL,
    sha DECIMAL(12,2) NOT NULL, -- Changed from nhif
    other_deductions DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) NOT NULL,
    net_pay DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processed_by VARCHAR(100),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    UNIQUE(employee_id, period)
);

-- Performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    review_period VARCHAR(10) NOT NULL, -- Q1 2024, Q2 2024, etc.
    review_type VARCHAR(20) NOT NULL DEFAULT 'quarterly',
    rating VARCHAR(20) NOT NULL,
    score INTEGER,
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    development_plan TEXT,
    reviewed_by VARCHAR(100) NOT NULL,
    review_date DATE NOT NULL,
    next_review_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- HR settings table
CREATE TABLE IF NOT EXISTS hr_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_phone VARCHAR(20),
    company_email VARCHAR(255),
    
    -- Leave Policies
    annual_leave_entitlement INTEGER DEFAULT 21,
    sick_leave_entitlement INTEGER DEFAULT 30,
    maternity_leave_entitlement INTEGER DEFAULT 90,
    paternity_leave_entitlement INTEGER DEFAULT 14,
    
    -- Payroll Settings
    payroll_frequency VARCHAR(20) DEFAULT 'monthly',
    payroll_cutoff_day INTEGER DEFAULT 25,
    payroll_pay_day INTEGER DEFAULT 30,
    
    -- Statutory Rates (stored as JSON)
    paye_rates JSONB,
    nssf_rate DECIMAL(5,4) DEFAULT 0.06,
    sha_rates JSONB, -- Changed from nhif_rates
    
    -- Working Hours
    standard_working_hours INTEGER DEFAULT 8,
    working_days_per_week INTEGER DEFAULT 5,
    overtime_rate DECIMAL(5,2) DEFAULT 1.5,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default HR settings
INSERT INTO hr_settings (
    company_name,
    company_address,
    company_phone,
    company_email,
    paye_rates,
    sha_rates
) VALUES (
    'TrustWaves Network',
    'Nairobi, Kenya',
    '+254700000000',
    'hr@trustwavesnetwork.com',
    '{"0": 0, "24000": 0.1, "32333": 0.25, "500000": 0.3, "800000": 0.325, "above": 0.35}',
    '{"0": 150, "6000": 300, "8000": 400, "12000": 500, "15000": 600, "20000": 750, "25000": 850, "30000": 900, "35000": 950, "40000": 1000, "45000": 1100, "50000": 1200, "60000": 1300, "70000": 1400, "80000": 1500, "90000": 1600, "100000": 1700}'
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);

-- Insert sample employees
INSERT INTO employees (
    employee_id, first_name, last_name, email, phone, national_id,
    position, department, basic_salary, kra_pin, nssf_number, sha_number,
    portal_username, portal_password
) VALUES 
(
    'EMP001', 'John', 'Smith', 'john.smith@trustwavesnetwork.com', '+254712345678', '12345678',
    'Network Engineer', 'Technical', 85000, 'A123456789Z', '123456789', '987654321',
    'john.smith', 'password123'
),
(
    'EMP002', 'Sarah', 'Johnson', 'sarah.johnson@trustwavesnetwork.com', '+254723456789', '23456789',
    'Customer Support Manager', 'Support', 65000, 'B234567890Z', '234567890', '876543210',
    'sarah.johnson', 'password123'
),
(
    'EMP003', 'Mike', 'Wilson', 'mike.wilson@trustwavesnetwork.com', '+254734567890', '34567890',
    'Sales Manager', 'Sales', 75000, 'C345678901Z', '345678901', '765432109',
    'mike.wilson', 'password123'
),
(
    'EMP004', 'Grace', 'Wanjiku', 'grace.wanjiku@trustwavesnetwork.com', '+254745678901', '45678901',
    'HR Officer', 'HR', 55000, 'D456789012Z', '456789012', '654321098',
    'grace.wanjiku', 'password123'
) ON CONFLICT (employee_id) DO NOTHING;
