-- Missing Tables for Complete System Form Support
-- This script creates all tables needed to support the forms identified in the system

-- HR Management Tables
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    allowances DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES employees(id),
    created_by INTEGER REFERENCES employees(id),
    due_date DATE,
    completed_at TIMESTAMP,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    progress INTEGER DEFAULT 0,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Management Tables
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    fuel_type VARCHAR(30),
    engine_capacity VARCHAR(20),
    registration_date DATE,
    insurance_expiry DATE,
    license_expiry DATE,
    assigned_driver INTEGER REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'active',
    mileage INTEGER DEFAULT 0,
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES employees(id),
    fuel_date DATE NOT NULL,
    odometer_reading INTEGER,
    fuel_quantity DECIMAL(8,2) NOT NULL,
    fuel_cost DECIMAL(10,2) NOT NULL,
    fuel_station VARCHAR(255),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL,
    maintenance_date DATE NOT NULL,
    odometer_reading INTEGER,
    cost DECIMAL(10,2),
    service_provider VARCHAR(255),
    description TEXT,
    next_service_date DATE,
    next_service_mileage INTEGER,
    parts_replaced TEXT[],
    warranty_expiry DATE,
    receipt_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transportation_fares (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    travel_date DATE NOT NULL,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    transport_type VARCHAR(50),
    fare_amount DECIMAL(8,2) NOT NULL,
    purpose VARCHAR(255),
    receipt_number VARCHAR(100),
    approved_by INTEGER REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communication Tables
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    recipient_type VARCHAR(20) NOT NULL, -- 'customer', 'employee', 'group'
    recipient_id INTEGER,
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'sent',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivery_status VARCHAR(50),
    read_at TIMESTAMP,
    template_id INTEGER,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    template_type VARCHAR(50),
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_communications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    channel VARCHAR(30), -- 'email', 'sms', 'phone', 'portal'
    status VARCHAR(20) DEFAULT 'sent',
    handled_by INTEGER REFERENCES users(id),
    response_required BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP,
    tags TEXT[],
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support System Enhancement
CREATE TABLE IF NOT EXISTS ticket_responses (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    responder_id INTEGER REFERENCES users(id),
    response_text TEXT NOT NULL,
    response_type VARCHAR(30) DEFAULT 'comment', -- 'comment', 'solution', 'escalation'
    is_internal BOOLEAN DEFAULT false,
    time_spent INTEGER, -- minutes
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Management Tables
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    unit_of_measure VARCHAR(20),
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER,
    reorder_point INTEGER,
    location VARCHAR(255),
    supplier VARCHAR(255),
    barcode VARCHAR(100),
    serial_numbers TEXT[],
    warranty_period INTEGER, -- months
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    reference_type VARCHAR(50), -- 'purchase', 'sale', 'installation', 'return', 'adjustment'
    reference_id INTEGER,
    customer_id INTEGER REFERENCES customers(id),
    employee_id INTEGER REFERENCES employees(id),
    notes TEXT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Management Tables
CREATE TABLE IF NOT EXISTS financial_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    parent_account_id INTEGER REFERENCES financial_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'payment', 'invoice', 'adjustment', 'transfer'
    reference_id INTEGER,
    customer_id INTEGER REFERENCES customers(id),
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'completed',
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_entries (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES financial_accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network Monitoring Enhancement
CREATE TABLE IF NOT EXISTS network_monitoring (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES network_devices(id),
    customer_id INTEGER REFERENCES customers(id),
    metric_type VARCHAR(50) NOT NULL, -- 'bandwidth', 'latency', 'uptime', 'packet_loss'
    metric_value DECIMAL(15,4),
    unit VARCHAR(20),
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'normal', -- 'normal', 'warning', 'critical'
    threshold_exceeded BOOLEAN DEFAULT false,
    alert_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_usage (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id),
    usage_date DATE NOT NULL,
    download_bytes BIGINT DEFAULT 0,
    upload_bytes BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- minutes
    peak_download_speed INTEGER, -- kbps
    peak_upload_speed INTEGER, -- kbps
    data_limit_exceeded BOOLEAN DEFAULT false,
    throttled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_outages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    affected_area VARCHAR(255),
    outage_type VARCHAR(50), -- 'planned', 'unplanned'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    estimated_resolution TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'investigating'
    affected_customers INTEGER DEFAULT 0,
    root_cause TEXT,
    resolution_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Administration Tables
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warning', 'error', 'critical'
    category VARCHAR(100),
    message TEXT NOT NULL,
    context JSONB,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
    category VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    parameters JSONB,
    schedule VARCHAR(50), -- 'manual', 'daily', 'weekly', 'monthly'
    format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
    recipients TEXT[],
    last_generated TIMESTAMP,
    next_generation TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items (missing from invoices)
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    service_id INTEGER REFERENCES customer_services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_period ON payroll(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_network_monitoring_device_id ON network_monitoring(device_id);
CREATE INDEX IF NOT EXISTS idx_network_monitoring_timestamp ON network_monitoring(timestamp);
CREATE INDEX IF NOT EXISTS idx_customer_usage_customer_id ON customer_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_usage_date ON customer_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Add some sample data for testing
INSERT INTO message_templates (name, subject, body, template_type, variables) VALUES
('Welcome Message', 'Welcome to {{company_name}}', 'Dear {{customer_name}}, welcome to our ISP service. Your account has been activated.', 'customer_welcome', '{"company_name": "text", "customer_name": "text"}'),
('Payment Reminder', 'Payment Due Reminder', 'Dear {{customer_name}}, your payment of {{amount}} is due on {{due_date}}.', 'payment_reminder', '{"customer_name": "text", "amount": "currency", "due_date": "date"}'),
('Service Outage', 'Service Outage Notification', 'We are experiencing a service outage in {{area}}. Expected resolution: {{resolution_time}}.', 'outage_notification', '{"area": "text", "resolution_time": "datetime"}');

INSERT INTO financial_accounts (account_code, account_name, account_type, description) VALUES
('1000', 'Cash', 'asset', 'Cash on hand and in bank'),
('1100', 'Accounts Receivable', 'asset', 'Money owed by customers'),
('1200', 'Equipment', 'asset', 'Network equipment and hardware'),
('2000', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
('3000', 'Owner Equity', 'equity', 'Owner investment in business'),
('4000', 'Service Revenue', 'revenue', 'Revenue from internet services'),
('5000', 'Operating Expenses', 'expense', 'General operating expenses'),
('5100', 'Equipment Maintenance', 'expense', 'Network equipment maintenance costs');

-- Update existing tables with missing columns if needed
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'residential';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contract_end_date DATE;

ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS installation_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS equipment_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS early_termination_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add constraints and triggers for data integrity
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers for tables with updated_at columns
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_accounts_updated_at BEFORE UPDATE ON financial_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_outages_updated_at BEFORE UPDATE ON service_outages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
