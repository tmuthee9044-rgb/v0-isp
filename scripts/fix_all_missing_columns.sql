-- ================================================
-- Fix All Missing Columns - Based on Schema Verification
-- Adds 191 missing columns to 43 tables
-- ================================================

-- TABLE: openvpn_logs
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS client_ip INET;
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS server_ip INET;
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS bytes_sent BIGINT DEFAULT 0;
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS bytes_received BIGINT DEFAULT 0;
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS session_duration INTEGER;
ALTER TABLE openvpn_logs ADD COLUMN IF NOT EXISTS log_timestamp TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: router_sync_status
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS router_id INTEGER;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS customer_service_id INTEGER;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS ip_address_id INTEGER;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS sync_message TEXT;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE router_sync_status ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- TABLE: messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- TABLE: payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';

-- TABLE: capacity_alerts
ALTER TABLE capacity_alerts ADD COLUMN IF NOT EXISTS alert_type VARCHAR(100);
ALTER TABLE capacity_alerts ADD COLUMN IF NOT EXISTS severity VARCHAR(50);
ALTER TABLE capacity_alerts ADD COLUMN IF NOT EXISTS current_value NUMERIC(15,2);
ALTER TABLE capacity_alerts ADD COLUMN IF NOT EXISTS threshold_value NUMERIC(15,2);
ALTER TABLE capacity_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: routers (CREATE if not exists)
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    firmware_version VARCHAR(100),
    location_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    connection_type VARCHAR(50),
    username VARCHAR(255),
    password VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync TIMESTAMP WITHOUT TIME ZONE,
    sync_error TEXT,
    configuration JSONB,
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    temperature NUMERIC(5,2),
    uptime BIGINT,
    last_seen TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- TABLE: server_configurations
ALTER TABLE server_configurations ADD COLUMN IF NOT EXISTS server_name VARCHAR(255);
ALTER TABLE server_configurations ADD COLUMN IF NOT EXISTS server_type VARCHAR(100);
ALTER TABLE server_configurations ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE server_configurations ADD COLUMN IF NOT EXISTS port INTEGER;
ALTER TABLE server_configurations ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: bandwidth_patterns
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS hour_of_day INTEGER;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- TABLE: task_attachments
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS filename VARCHAR(500);
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS uploaded_by INTEGER;

-- TABLE: communication_settings
ALTER TABLE communication_settings ADD COLUMN IF NOT EXISTS setting_type VARCHAR(100);
ALTER TABLE communication_settings ADD COLUMN IF NOT EXISTS provider VARCHAR(100);
ALTER TABLE communication_settings ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255);
ALTER TABLE communication_settings ADD COLUMN IF NOT EXISTS api_key TEXT;

-- TABLE: mpesa_logs
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(255);
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(255);
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50);
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS result_code INTEGER;
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS result_desc TEXT;
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS raw_response JSONB;
ALTER TABLE mpesa_logs ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: network_forecasts
ALTER TABLE network_forecasts ADD COLUMN IF NOT EXISTS forecast_period VARCHAR(50);
ALTER TABLE network_forecasts ADD COLUMN IF NOT EXISTS predicted_users INTEGER;
ALTER TABLE network_forecasts ADD COLUMN IF NOT EXISTS predicted_bandwidth BIGINT;
ALTER TABLE network_forecasts ADD COLUMN IF NOT EXISTS growth_rate NUMERIC(5,2);

-- TABLE: tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: customer_addresses
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(50);
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(255);

-- TABLE: customer_categories
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2);
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 5;
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS description TEXT;

-- TABLE: router_performance_history
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS cpu_usage NUMERIC(5,2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS memory_usage NUMERIC(5,2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS temperature NUMERIC(5,2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS uptime BIGINT;
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS bandwidth_in BIGINT;
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS bandwidth_out BIGINT;
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS latency NUMERIC(10,2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS packet_loss NUMERIC(5,2);

-- TABLE: finance_audit_trail
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS table_name VARCHAR(255);
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS record_id INTEGER;
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE finance_audit_trail ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) NOT NULL DEFAULT 'unknown';

-- TABLE: capacity_predictions
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS prediction_date DATE;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS predicted_capacity BIGINT;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(5,2);
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS model_version VARCHAR(50);

-- TABLE: payroll_records
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS allowances NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(15,2);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS deductions NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_date DATE;

-- TABLE: admin_logs (additional columns)
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS resource_id INTEGER;

-- TABLE: company_profiles (critical columns)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Africa/Nairobi';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(50) DEFAULT '24h';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(50);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(20) DEFAULT 'monday';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_system VARCHAR(50);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_prefix VARCHAR(10);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS established_date DATE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- TABLE: payment_gateway_configs
ALTER TABLE payment_gateway_configs ADD COLUMN IF NOT EXISTS gateway_name VARCHAR(100);
ALTER TABLE payment_gateway_configs ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- TABLE: user_activity_logs
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS user_type VARCHAR(50);
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS activity VARCHAR(100);
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- TABLE: infrastructure_investments
ALTER TABLE infrastructure_investments ADD COLUMN IF NOT EXISTS investment_type VARCHAR(100);
ALTER TABLE infrastructure_investments ADD COLUMN IF NOT EXISTS investment_date DATE;
ALTER TABLE infrastructure_investments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE infrastructure_investments ADD COLUMN IF NOT EXISTS expected_roi NUMERIC(10,2);

-- TABLE: customer_services (critical column)
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- TABLE: message_campaigns (complete missing columns)
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS target_audience JSONB;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE message_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: portal_settings
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS setting_key VARCHAR(255);
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS setting_value TEXT;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS setting_type VARCHAR(100);
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- TABLE: invoices (additional critical columns)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;

-- Update total_amount from amount column for existing invoices where total_amount is NULL
UPDATE invoices SET total_amount = amount WHERE total_amount IS NULL OR total_amount = 0;

-- TABLE: ip_subnets (complete missing columns)
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS cidr VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS version VARCHAR(10) DEFAULT 'IPv4';
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS router_id BIGINT;
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS allocation_mode VARCHAR(50);
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS used_ips INTEGER DEFAULT 0;
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS total_ips INTEGER;
-- Added available_ips column for local PostgreSQL compatibility
ALTER TABLE ip_subnets ADD COLUMN IF NOT EXISTS available_ips INTEGER DEFAULT 0;

-- Update available_ips to match total_ips - used_ips for existing records
UPDATE ip_subnets SET available_ips = total_ips - used_ips WHERE available_ips IS NULL OR available_ips = 0;

-- TABLE: roles  
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;

-- TABLE: customers (ensure name column exists and is set properly)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(500);

-- Adding all missing customer form fields to match API expectations
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_preferences JSONB;

-- Adding all customer form fields to match the exact data structure sent by the form
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_county VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_gps_coordinates VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

-- Update name column for existing customers if it's NULL
UPDATE customers 
SET name = CASE 
    WHEN customer_type = 'business' THEN COALESCE(business_name, first_name || ' ' || last_name)
    ELSE COALESCE(first_name || ' ' || last_name, business_name)
END
WHERE name IS NULL;

-- TABLE: customer_contacts
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS relationship VARCHAR(100);

-- TABLE: customer_documents (file storage support)
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS file_content BYTEA;
CREATE INDEX IF NOT EXISTS idx_customer_document_access_logs_document_id ON customer_document_access_logs(document_id);

-- TABLE: locations (ensure city column exists)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- TABLE: automation_workflows (missing columns)
ALTER TABLE automation_workflows ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE automation_workflows ADD COLUMN IF NOT EXISTS description TEXT;

-- TABLE: ip_addresses (complete all missing columns)
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS subnet_id INTEGER;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available';
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS notes TEXT;

-- TABLE: performance_reviews (complete all missing columns)
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS employee_id INTEGER;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS reviewer_id INTEGER;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS review_period_start DATE;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS review_period_end DATE;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS overall_rating INTEGER;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS goals_achievement TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS development_plan TEXT;

-- TABLE: service_plans (ensure no category column exists since it's not in Neon schema)
-- No changes needed - column doesn't exist in Neon

-- TABLE: router_logs (complete all missing columns)
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS router_id INTEGER;
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS log_level VARCHAR(50);
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS source_module VARCHAR(100);
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS raw_log TEXT;
ALTER TABLE router_logs ADD COLUMN IF NOT EXISTS log_timestamp TIMESTAMP WITHOUT TIME ZONE;

-- TABLE: pending_tasks (CREATE if not exists)
-- Adding pending_tasks table for background task queue system
CREATE TABLE IF NOT EXISTS pending_tasks (
    id BIGSERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id BIGINT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    scheduled_for TIMESTAMP WITHOUT TIME ZONE
);

-- Add indexes for pending_tasks
CREATE INDEX IF NOT EXISTS idx_pending_tasks_status ON pending_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_resource ON pending_tasks(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_created ON pending_tasks(created_at);

-- ================================================
-- Add indexes for better performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_prefix ON company_profiles(company_prefix);
CREATE INDEX IF NOT EXISTS idx_routers_sync_status ON routers(sync_status);
CREATE INDEX IF NOT EXISTS idx_customer_services_updated_at ON customer_services(updated_at);

-- Adding indexes for IP address performance optimization
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_id ON ip_addresses(subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip_address ON ip_addresses(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_ip_address ON customer_services(ip_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_ip_subnets_router_id ON ip_subnets(router_id);

-- Adding unique constraint for account_balances table to prevent duplicates
-- Ensure account_balances has unique constraint on customer_id
ALTER TABLE account_balances DROP CONSTRAINT IF EXISTS account_balances_customer_id_key;
ALTER TABLE account_balances ADD CONSTRAINT account_balances_customer_id_key UNIQUE (customer_id);

-- Finance performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_invoice_date ON supplier_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_created_at ON finance_audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_tax_returns_period_id ON tax_returns(period_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_filed_date ON tax_returns(filed_date);
CREATE INDEX IF NOT EXISTS idx_tax_returns_due_date ON tax_returns(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_returns_status ON tax_returns(status);

-- ================================================
-- Add inventory_categories table for category management
-- ================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(100) DEFAULT 'Package',
    color VARCHAR(100) DEFAULT 'bg-gray-500',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insert default categories if table is empty
INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Network Equipment', 'Router', 'bg-blue-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Network Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Fiber Optic Equipment', 'Zap', 'bg-green-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Fiber Optic Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Wireless Equipment', 'Wifi', 'bg-purple-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Wireless Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Server Equipment', 'Server', 'bg-orange-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Server Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Testing Equipment', 'BarChart3', 'bg-red-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Testing Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Power Equipment', 'Zap', 'bg-yellow-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Power Equipment');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Installation Tools', 'Package', 'bg-gray-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Installation Tools');

INSERT INTO inventory_categories (name, icon, color) 
SELECT 'Cables & Accessories', 'Cable', 'bg-indigo-500'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Cables & Accessories');

-- ================================================
-- END OF SCRIPT
-- ================================================
-- Removed problematic DO block that was causing syntax errors
