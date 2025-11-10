-- Comprehensive migration to create all missing tables for ISP management system
-- This script creates tables that are referenced in the code but may not exist

BEGIN;

-- Analytics & Monitoring Tables
CREATE TABLE IF NOT EXISTS router_performance_history (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id),
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    bandwidth_in BIGINT,
    bandwidth_out BIGINT,
    packet_loss NUMERIC(5,2),
    latency NUMERIC(8,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacity_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE NOT NULL,
    predicted_capacity BIGINT,
    confidence_level NUMERIC(5,2),
    model_version VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_period VARCHAR(20) NOT NULL,
    predicted_users INTEGER,
    predicted_bandwidth BIGINT,
    growth_rate NUMERIC(5,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacity_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value NUMERIC(10,2),
    current_value NUMERIC(10,2),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS bandwidth_patterns (
    id SERIAL PRIMARY KEY,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    average_usage BIGINT,
    peak_usage BIGINT,
    pattern_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS infrastructure_investments (
    id SERIAL PRIMARY KEY,
    investment_type VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(12,2),
    investment_date DATE,
    expected_roi NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Task Management Tables
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES employees(id),
    created_by INTEGER REFERENCES employees(id),
    due_date DATE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES employees(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- HR & Payroll Tables
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary NUMERIC(12,2),
    overtime_hours NUMERIC(5,2) DEFAULT 0,
    overtime_rate NUMERIC(8,2) DEFAULT 0,
    allowances NUMERIC(10,2) DEFAULT 0,
    deductions NUMERIC(10,2) DEFAULT 0,
    gross_pay NUMERIC(12,2),
    tax_deduction NUMERIC(10,2) DEFAULT 0,
    net_pay NUMERIC(12,2),
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    reviewer_id INTEGER REFERENCES employees(id),
    review_period_start DATE,
    review_period_end DATE,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    goals_achievement TEXT,
    strengths TEXT,
    areas_for_improvement TEXT,
    development_plan TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Settings & Configuration Tables
CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    established_date DATE,
    industry VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS server_configurations (
    id SERIAL PRIMARY KEY,
    server_type VARCHAR(50) NOT NULL, -- 'openvpn', 'radius', 'dns', etc.
    server_name VARCHAR(100) NOT NULL,
    ip_address INET,
    port INTEGER,
    configuration JSONB,
    status VARCHAR(20) DEFAULT 'active',
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(50) NOT NULL,
    api_key TEXT,
    secret_key TEXT,
    webhook_url TEXT,
    is_sandbox BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT false,
    configuration JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
    provider VARCHAR(50),
    api_key TEXT,
    sender_id VARCHAR(50),
    configuration JSONB,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Messaging Tables (if not already created)
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(20) NOT NULL, -- 'customer', 'employee', 'group'
    recipient_id INTEGER,
    sender_id INTEGER REFERENCES employees(id),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'system'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    template_id INTEGER REFERENCES message_templates(id),
    metadata JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id INTEGER REFERENCES message_templates(id),
    target_audience JSONB, -- Criteria for selecting recipients
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Enhanced Logging Tables
CREATE TABLE IF NOT EXISTS openvpn_logs (
    id SERIAL PRIMARY KEY,
    client_ip INET,
    username VARCHAR(100),
    action VARCHAR(50), -- 'connect', 'disconnect', 'auth_success', 'auth_fail'
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    session_duration INTEGER, -- in seconds
    server_ip INET,
    log_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radius_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    nas_ip INET,
    nas_port INTEGER,
    service_type VARCHAR(50),
    framed_ip INET,
    calling_station_id VARCHAR(50),
    called_station_id VARCHAR(50),
    acct_session_id VARCHAR(100),
    acct_status_type VARCHAR(20), -- 'Start', 'Stop', 'Update'
    acct_input_octets BIGINT DEFAULT 0,
    acct_output_octets BIGINT DEFAULT 0,
    acct_session_time INTEGER DEFAULT 0,
    acct_terminate_cause VARCHAR(50),
    log_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mpesa_logs (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    amount NUMERIC(10,2),
    transaction_type VARCHAR(50), -- 'payment', 'reversal', 'query'
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    result_code INTEGER,
    result_desc TEXT,
    customer_id INTEGER REFERENCES customers(id),
    invoice_id INTEGER REFERENCES invoices(id),
    raw_response JSONB,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS router_logs (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id),
    log_level VARCHAR(20), -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    source_module VARCHAR(50),
    event_type VARCHAR(50),
    raw_log TEXT,
    log_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES employees(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- 'customer', 'service', 'payment', etc.
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(20), -- 'customer', 'employee', 'admin'
    activity VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Customer Enhancement Tables
CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    priority_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL, -- 'billing', 'installation', 'mailing'
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    gps_coordinates VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL, -- 'primary', 'billing', 'technical', 'emergency'
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'technical', 'billing', 'support'
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_router_performance_timestamp ON router_performance_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON payroll_records(employee_id, pay_period_start);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_openvpn_logs_timestamp ON openvpn_logs(log_timestamp);
CREATE INDEX IF NOT EXISTS idx_radius_logs_username ON radius_logs(username);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_transaction_id ON mpesa_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_action ON admin_logs(admin_id, action);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_gateway_configs_updated_at BEFORE UPDATE ON payment_gateway_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_settings_updated_at BEFORE UPDATE ON communication_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portal_settings_updated_at BEFORE UPDATE ON portal_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
