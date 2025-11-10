-- Company Profile Settings
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    description TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    founded_year INTEGER,
    logo TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    slogan VARCHAR(255),
    
    -- Contact Information
    physical_address TEXT NOT NULL,
    postal_address TEXT,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
    main_phone VARCHAR(20) NOT NULL,
    support_phone VARCHAR(20),
    main_email VARCHAR(255) NOT NULL,
    support_email VARCHAR(255),
    website VARCHAR(255),
    fax VARCHAR(20),
    
    -- Localization
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    date_format VARCHAR(20) NOT NULL DEFAULT 'dd/mm/yyyy',
    time_format VARCHAR(10) NOT NULL DEFAULT '24h',
    decimal_separator VARCHAR(1) NOT NULL DEFAULT '.',
    thousand_separator VARCHAR(1) NOT NULL DEFAULT ',',
    currency_position VARCHAR(10) NOT NULL DEFAULT 'before',
    fiscal_year_start VARCHAR(20) NOT NULL DEFAULT 'january',
    week_start VARCHAR(10) NOT NULL DEFAULT 'monday',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Server Configuration Settings
CREATE TABLE IF NOT EXISTS server_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- RADIUS Configuration
    radius_server VARCHAR(255),
    radius_port INTEGER DEFAULT 1812,
    radius_accounting_port INTEGER DEFAULT 1813,
    radius_timeout INTEGER DEFAULT 5,
    radius_secret VARCHAR(255),
    enable_pap BOOLEAN DEFAULT true,
    enable_chap BOOLEAN DEFAULT true,
    enable_mschap BOOLEAN DEFAULT false,
    enable_accounting BOOLEAN DEFAULT true,
    
    -- OpenVPN Configuration
    vpn_server_ip VARCHAR(45),
    vpn_port INTEGER DEFAULT 1194,
    vpn_protocol VARCHAR(10) DEFAULT 'udp',
    vpn_cipher VARCHAR(50) DEFAULT 'aes-256-cbc',
    vpn_network VARCHAR(20) DEFAULT '10.8.0.0/24',
    enable_tls_auth BOOLEAN DEFAULT true,
    enable_client_to_client BOOLEAN DEFAULT false,
    enable_duplicate_cn BOOLEAN DEFAULT false,
    enable_compression BOOLEAN DEFAULT true,
    primary_dns VARCHAR(45) DEFAULT '8.8.8.8',
    secondary_dns VARCHAR(45) DEFAULT '8.8.4.4',
    
    -- Network Settings
    management_vlan INTEGER DEFAULT 100,
    customer_vlan_range VARCHAR(20) DEFAULT '200-299',
    snmp_community VARCHAR(100) DEFAULT 'public',
    ntp_server VARCHAR(255) DEFAULT 'pool.ntp.org',
    enable_firewall BOOLEAN DEFAULT true,
    enable_ddos_protection BOOLEAN DEFAULT true,
    enable_port_scan_detection BOOLEAN DEFAULT false,
    enable_intrusion_detection BOOLEAN DEFAULT false,
    default_upload_limit INTEGER DEFAULT 10,
    default_download_limit INTEGER DEFAULT 50,
    burst_ratio DECIMAL(3,1) DEFAULT 1.5,
    
    -- Monitoring
    enable_snmp_monitoring BOOLEAN DEFAULT true,
    enable_bandwidth_monitoring BOOLEAN DEFAULT true,
    enable_uptime_monitoring BOOLEAN DEFAULT true,
    enable_alert_notifications BOOLEAN DEFAULT true,
    monitoring_interval INTEGER DEFAULT 5,
    alert_threshold INTEGER DEFAULT 80,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Gateway Configuration
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- M-Pesa Configuration
    mpesa_environment VARCHAR(20) DEFAULT 'production',
    mpesa_business_short_code VARCHAR(20),
    mpesa_consumer_key TEXT,
    mpesa_consumer_secret TEXT,
    stk_short_code VARCHAR(20),
    stk_passkey TEXT,
    callback_url VARCHAR(500),
    result_url VARCHAR(500),
    c2b_short_code VARCHAR(20),
    c2b_validation_url VARCHAR(500),
    c2b_confirmation_url VARCHAR(500),
    response_type VARCHAR(20) DEFAULT 'Completed',
    
    -- Bank Integration
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_api_key TEXT,
    bank_api_secret TEXT,
    enable_auto_reconciliation BOOLEAN DEFAULT false,
    enable_realtime_notifications BOOLEAN DEFAULT true,
    min_amount DECIMAL(10,2) DEFAULT 100.00,
    max_amount DECIMAL(10,2) DEFAULT 1000000.00,
    
    -- Payment Methods
    enable_mpesa BOOLEAN DEFAULT true,
    enable_bank_transfer BOOLEAN DEFAULT true,
    enable_credit_card BOOLEAN DEFAULT false,
    enable_cash_payments BOOLEAN DEFAULT true,
    
    -- Processing Settings
    processing_fee DECIMAL(5,2) DEFAULT 2.50,
    min_processing_fee DECIMAL(10,2) DEFAULT 10.00,
    payment_timeout INTEGER DEFAULT 15,
    retry_attempts INTEGER DEFAULT 3,
    enable_auto_retry BOOLEAN DEFAULT true,
    enable_payment_receipts BOOLEAN DEFAULT true,
    
    -- Webhooks
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    enable_payment_successful BOOLEAN DEFAULT true,
    enable_payment_failed BOOLEAN DEFAULT true,
    enable_payment_pending BOOLEAN DEFAULT false,
    enable_refund_processed BOOLEAN DEFAULT false,
    webhook_timeout INTEGER DEFAULT 30,
    webhook_max_retries INTEGER DEFAULT 3,
    webhook_retry_delay INTEGER DEFAULT 60,
    enable_webhook_logging BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Communication Settings
CREATE TABLE IF NOT EXISTS communication_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Email Configuration
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password TEXT,
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    reply_to_email VARCHAR(255),
    encryption VARCHAR(10) DEFAULT 'tls',
    enable_html_emails BOOLEAN DEFAULT true,
    enable_email_tracking BOOLEAN DEFAULT false,
    enable_auto_retry_emails BOOLEAN DEFAULT true,
    enable_email_queue BOOLEAN DEFAULT true,
    email_max_retries INTEGER DEFAULT 3,
    email_retry_delay INTEGER DEFAULT 5,
    email_batch_size INTEGER DEFAULT 50,
    
    -- SMS Configuration
    sms_provider VARCHAR(50) DEFAULT 'africastalking',
    sms_username VARCHAR(255),
    sms_api_key TEXT,
    sms_sender_id VARCHAR(20),
    sms_endpoint VARCHAR(500),
    enable_delivery_reports BOOLEAN DEFAULT true,
    enable_unicode_support BOOLEAN DEFAULT false,
    enable_auto_retry_sms BOOLEAN DEFAULT true,
    enable_sms_queue BOOLEAN DEFAULT true,
    sms_max_retries INTEGER DEFAULT 3,
    sms_retry_delay INTEGER DEFAULT 2,
    sms_batch_size INTEGER DEFAULT 100,
    sms_cost_per_message DECIMAL(5,2) DEFAULT 2.50,
    daily_sms_limit INTEGER DEFAULT 1000,
    enable_sms_budget_alerts BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Management Settings
CREATE TABLE IF NOT EXISTS user_management_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Auto-sync Settings
    enable_auto_create_accounts BOOLEAN DEFAULT true,
    enable_auto_disable_terminated BOOLEAN DEFAULT true,
    enable_sync_department_changes BOOLEAN DEFAULT true,
    enable_sync_contact_info BOOLEAN DEFAULT true,
    
    -- Password Policy
    min_password_length INTEGER DEFAULT 8,
    password_expiry INTEGER DEFAULT 90,
    require_uppercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT false,
    prevent_password_reuse BOOLEAN DEFAULT true,
    
    -- Session Management
    session_timeout INTEGER DEFAULT 60,
    max_login_attempts INTEGER DEFAULT 5,
    lockout_duration INTEGER DEFAULT 30,
    max_concurrent_sessions INTEGER DEFAULT 3,
    force_password_change_first_login BOOLEAN DEFAULT true,
    enable_remember_login BOOLEAN DEFAULT true,
    
    -- Two-Factor Authentication
    enable_2fa_for_admins BOOLEAN DEFAULT true,
    enable_optional_2fa BOOLEAN DEFAULT true,
    allow_2fa_sms BOOLEAN DEFAULT true,
    allow_2fa_email BOOLEAN DEFAULT true,
    allow_2fa_authenticator BOOLEAN DEFAULT false,
    
    -- Account Provisioning
    username_format VARCHAR(50) DEFAULT 'firstname.lastname',
    email_domain VARCHAR(100) DEFAULT '@techconnect.co.ke',
    default_password_policy VARCHAR(50) DEFAULT 'temporary',
    notification_method VARCHAR(20) DEFAULT 'email',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Portal Settings
CREATE TABLE IF NOT EXISTS portal_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Portal - Administrative
    customer_portal_url VARCHAR(500),
    customer_portal_title VARCHAR(255),
    customer_welcome_message TEXT,
    allow_self_registration BOOLEAN DEFAULT true,
    require_email_verification BOOLEAN DEFAULT true,
    require_admin_approval BOOLEAN DEFAULT false,
    customer_session_timeout INTEGER DEFAULT 30,
    
    -- Customer Portal - System
    enable_https_only BOOLEAN DEFAULT true,
    enable_rate_limiting BOOLEAN DEFAULT true,
    enable_captcha BOOLEAN DEFAULT false,
    enable_caching BOOLEAN DEFAULT true,
    enable_compression BOOLEAN DEFAULT true,
    enable_cdn BOOLEAN DEFAULT false,
    max_file_upload_size INTEGER DEFAULT 10,
    
    -- Admin Portal - Administrative
    admin_portal_url VARCHAR(500),
    admin_portal_title VARCHAR(255),
    enable_ip_whitelist BOOLEAN DEFAULT false,
    require_2fa_for_all_admins BOOLEAN DEFAULT true,
    enable_single_session BOOLEAN DEFAULT true,
    allowed_ips TEXT,
    admin_session_timeout INTEGER DEFAULT 15,
    
    -- Admin Portal - System
    enable_audit_logging BOOLEAN DEFAULT true,
    log_failed_login_attempts BOOLEAN DEFAULT true,
    log_data_changes BOOLEAN DEFAULT true,
    enable_auto_database_backup BOOLEAN DEFAULT true,
    enable_configuration_backup BOOLEAN DEFAULT true,
    backup_retention INTEGER DEFAULT 30,
    
    -- Themes & Branding
    customer_theme VARCHAR(50) DEFAULT 'modern',
    customer_primary_color VARCHAR(7) DEFAULT '#3b82f6',
    customer_secondary_color VARCHAR(7) DEFAULT '#64748b',
    customer_font_family VARCHAR(50) DEFAULT 'inter',
    admin_theme VARCHAR(50) DEFAULT 'dark',
    admin_primary_color VARCHAR(7) DEFAULT '#1f2937',
    admin_accent_color VARCHAR(7) DEFAULT '#3b82f6',
    admin_sidebar_style VARCHAR(50) DEFAULT 'collapsible',
    customer_custom_css TEXT,
    admin_custom_css TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Portal Features
CREATE TABLE IF NOT EXISTS portal_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_settings_id UUID REFERENCES portal_settings(id) ON DELETE CASCADE,
    
    -- Customer Portal Features
    enable_customer_dashboard BOOLEAN DEFAULT true,
    enable_bill_payment BOOLEAN DEFAULT true,
    enable_usage_statistics BOOLEAN DEFAULT true,
    enable_service_management BOOLEAN DEFAULT true,
    enable_support_tickets BOOLEAN DEFAULT true,
    enable_payment_history BOOLEAN DEFAULT true,
    enable_profile_management BOOLEAN DEFAULT true,
    enable_referral_program BOOLEAN DEFAULT false,
    enable_live_chat_support BOOLEAN DEFAULT false,
    enable_mobile_app_download BOOLEAN DEFAULT true,
    
    -- Admin Portal Features
    enable_customer_management BOOLEAN DEFAULT true,
    enable_billing_finance BOOLEAN DEFAULT true,
    enable_network_management BOOLEAN DEFAULT true,
    enable_support_system BOOLEAN DEFAULT true,
    enable_user_management BOOLEAN DEFAULT true,
    enable_reports_analytics BOOLEAN DEFAULT true,
    enable_inventory_management BOOLEAN DEFAULT true,
    enable_task_management BOOLEAN DEFAULT true,
    enable_hr_management BOOLEAN DEFAULT true,
    enable_vehicle_management BOOLEAN DEFAULT false,
    
    -- Notification Preferences
    enable_customer_bill_reminders BOOLEAN DEFAULT true,
    enable_customer_service_alerts BOOLEAN DEFAULT true,
    enable_customer_promotional_offers BOOLEAN DEFAULT false,
    enable_customer_maintenance_notifications BOOLEAN DEFAULT true,
    enable_admin_system_alerts BOOLEAN DEFAULT true,
    enable_admin_new_customer_notifications BOOLEAN DEFAULT true,
    enable_admin_payment_failure_notifications BOOLEAN DEFAULT true,
    enable_admin_task_assignment_notifications BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL,
    trigger_conditions JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    last_run TIMESTAMP WITH TIME ZONE,
    executions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Actions
CREATE TABLE IF NOT EXISTS automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL,
    execution_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Triggers
CREATE TABLE IF NOT EXISTS automation_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    conditions JSONB,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Tasks
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL,
    schedule VARCHAR(255) NOT NULL, -- Cron expression
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    next_run TIMESTAMP WITH TIME ZONE,
    last_run TIMESTAMP WITH TIME ZONE,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Execution Logs
CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
    scheduled_task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    execution_type VARCHAR(50) NOT NULL, -- 'workflow' or 'scheduled_task'
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    execution_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO company_profiles (
    name, 
    physical_address, 
    city, 
    country, 
    main_phone, 
    main_email
) VALUES (
    'TechConnect ISP',
    '123 Tech Street, Innovation District',
    'Nairobi',
    'Kenya',
    '+254 700 123 456',
    'info@techconnect.co.ke'
) ON CONFLICT DO NOTHING;

INSERT INTO server_configurations DEFAULT VALUES ON CONFLICT DO NOTHING;
INSERT INTO payment_gateway_configs DEFAULT VALUES ON CONFLICT DO NOTHING;
INSERT INTO communication_settings DEFAULT VALUES ON CONFLICT DO NOTHING;
INSERT INTO user_management_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

INSERT INTO portal_settings (
    customer_portal_url,
    customer_portal_title,
    customer_welcome_message,
    admin_portal_url,
    admin_portal_title
) VALUES (
    'https://portal.techconnect.co.ke',
    'TechConnect Customer Portal',
    'Welcome to your TechConnect customer portal. Manage your account, view bills, and get support.',
    'https://admin.techconnect.co.ke',
    'TechConnect Admin Portal'
) ON CONFLICT DO NOTHING;

-- Insert portal features for the default portal settings
INSERT INTO portal_features (portal_settings_id)
SELECT id FROM portal_settings LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert default automation triggers
INSERT INTO automation_triggers (name, description, category) VALUES
('Customer Registration', 'When a new customer registers', 'Customer'),
('Payment Received', 'When payment is confirmed', 'Billing'),
('Payment Failed', 'When payment fails', 'Billing'),
('Bill Generated', 'When a new bill is generated', 'Billing'),
('Service Activated', 'When service is activated', 'Service'),
('Support Ticket Created', 'When a new ticket is created', 'Support'),
('Network Alert', 'When network issues are detected', 'Network'),
('Scheduled Time', 'At specific times/intervals', 'Schedule')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_workflows_status ON automation_workflows(status);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger_type ON automation_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_actions_workflow_id ON automation_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_order ON automation_actions(workflow_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_workflow_id ON automation_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_scheduled_task_id ON automation_execution_logs(scheduled_task_id);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_created_at ON automation_execution_logs(created_at);
