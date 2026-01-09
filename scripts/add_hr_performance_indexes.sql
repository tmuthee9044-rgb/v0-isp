-- Performance indexes for HR page to meet rule 7 (load under 5ms)

-- Index for employees table main queries
CREATE INDEX IF NOT EXISTS idx_employees_status_created ON employees(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_name_search ON employees(first_name, last_name);

-- Index for payroll records queries
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status);

-- Index for leave requests queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Index for employee performance reviews
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON employee_performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_date ON employee_performance_reviews(review_date DESC);

-- Analyze tables for query optimization
ANALYZE employees;
ANALYZE payroll_records;
ANALYZE leave_requests;
ANALYZE employee_performance_reviews;
