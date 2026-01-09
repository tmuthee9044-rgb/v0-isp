-- Complete schema creation script for all 146 tables
-- This script creates all tables with their exact column definitions from Neon

-- Drop and recreate tables to ensure schema consistency
DROP TABLE IF EXISTS account_balances CASCADE;
CREATE TABLE account_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    balance NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    status VARCHAR(50),
    last_invoice_date DATE,
    last_payment_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS admin_logs CASCADE;
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    action VARCHAR(255),
    resource_type VARCHAR(255),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS automation_workflows CASCADE;
CREATE TABLE automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    trigger_type VARCHAR(100),
    trigger_conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_access_logs CASCADE;
CREATE TABLE backup_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100),
    success BOOLEAN,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    additional_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_file_inventory CASCADE;
CREATE TABLE backup_file_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    file_path VARCHAR(1000),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_hash VARCHAR(255),
    is_encrypted BOOLEAN,
    compression_ratio NUMERIC,
    last_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_jobs CASCADE;
CREATE TABLE backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50),
    status VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_size VARCHAR(100),
    backup_path VARCHAR(1000),
    storage_location VARCHAR(255),
    encryption_used BOOLEAN,
    checksum VARCHAR(255),
    error_message TEXT,
    description TEXT,
    local_path VARCHAR(1000),
    remote_path VARCHAR(1000),
    cloud_path VARCHAR(1000),
    includes_database BOOLEAN,
    includes_files BOOLEAN,
    includes_config BOOLEAN,
    includes_logs BOOLEAN,
    compression_ratio NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_restore_logs CASCADE;
CREATE TABLE backup_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    restore_type VARCHAR(50),
    status VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    restore_location VARCHAR(1000),
    restored_by VARCHAR(255),
    restored_components TEXT[],
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_schedules CASCADE;
CREATE TABLE backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    backup_type VARCHAR(50),
    cron_expression VARCHAR(100),
    timezone VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    storage_locations TEXT[],
    retention_policy JSONB,
    backup_components JSONB,
    next_run TIMESTAMP WITH TIME ZONE,
    last_run TIMESTAMP WITH TIME ZONE,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    average_duration_minutes NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_settings CASCADE;
CREATE TABLE backup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enable_scheduled_backups BOOLEAN DEFAULT false,
    full_backup_frequency VARCHAR(50),
    full_backup_day VARCHAR(20),
    full_backup_time TIME,
    incremental_frequency VARCHAR(50),
    incremental_interval INTEGER,
    incremental_time TIME,
    database_retention_days INTEGER DEFAULT 30,
    file_retention_days INTEGER DEFAULT 30,
    enable_database_backup BOOLEAN DEFAULT true,
    enable_file_backup BOOLEAN DEFAULT true,
    backup_paths TEXT,
    exclude_patterns TEXT,
    database_compression VARCHAR(20),
    enable_encryption BOOLEAN DEFAULT false,
    encryption_key TEXT,
    enable_local_storage BOOLEAN DEFAULT true,
    local_storage_path VARCHAR(1000),
    local_storage_quota INTEGER,
    local_cleanup_policy VARCHAR(50),
    enable_remote_storage BOOLEAN DEFAULT false,
    remote_protocol VARCHAR(20),
    remote_host VARCHAR(255),
    remote_port INTEGER,
    remote_username VARCHAR(255),
    remote_password TEXT,
    remote_path VARCHAR(1000),
    enable_cloud_storage BOOLEAN DEFAULT false,
    cloud_provider VARCHAR(50),
    cloud_bucket VARCHAR(255),
    cloud_region VARCHAR(100),
    cloud_access_key TEXT,
    cloud_secret_key TEXT,
    enable_notifications BOOLEAN DEFAULT true,
    enable_integrity_check BOOLEAN DEFAULT true,
    enable_secure_delete BOOLEAN DEFAULT false,
    enable_access_logging BOOLEAN DEFAULT true,
    maintenance_start TIME,
    maintenance_end TIME,
    backup_customers BOOLEAN DEFAULT true,
    backup_billing BOOLEAN DEFAULT true,
    backup_network BOOLEAN DEFAULT true,
    backup_logs BOOLEAN DEFAULT true,
    backup_settings BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS backup_storage_locations CASCADE;
CREATE TABLE backup_storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    storage_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    configuration JSONB,
    connection_string TEXT,
    access_credentials JSONB,
    total_capacity_gb NUMERIC,
    used_space_gb NUMERIC,
    available_space_gb NUMERIC,
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(50),
    test_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS balance_sheet_view CASCADE;
CREATE TABLE balance_sheet_view (
    assets_total NUMERIC,
    liabilities_total NUMERIC,
    equity_total NUMERIC,
    revenue_total NUMERIC,
    expense_total NUMERIC
);

DROP TABLE IF EXISTS bandwidth_configs CASCADE;
CREATE TABLE bandwidth_configs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER,
    download_limit INTEGER,
    upload_limit INTEGER,
    burst_limit INTEGER,
    priority INTEGER,
    qos_policy VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS bandwidth_patterns CASCADE;
CREATE TABLE bandwidth_patterns (
    id SERIAL PRIMARY KEY,
    pattern_date DATE,
    hour_of_day INTEGER,
    day_of_week INTEGER,
    average_usage BIGINT,
    peak_usage BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS bank_transactions CASCADE;
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    transaction_id VARCHAR(255),
    bank_reference VARCHAR(255),
    amount NUMERIC,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50),
    processor_response JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS billing_cycles CASCADE;
CREATE TABLE billing_cycles (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    cycle_start DATE,
    cycle_end DATE,
    amount NUMERIC,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS bonus_campaigns CASCADE;
CREATE TABLE bonus_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255),
    description TEXT,
    campaign_type VARCHAR(100),
    bonus_rules JSONB,
    target_audience JSONB,
    start_date TIMESTAMP WITHOUT TIME ZONE,
    end_date TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    total_bonus_awarded NUMERIC DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS budget_line_items CASCADE;
CREATE TABLE budget_line_items (
    id SERIAL PRIMARY KEY,
    version_id INTEGER,
    category_id INTEGER,
    subcategory_id INTEGER,
    line_item_name VARCHAR(255),
    budgeted_amount NUMERIC,
    quarter_1 NUMERIC,
    quarter_2 NUMERIC,
    quarter_3 NUMERIC,
    quarter_4 NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS budget_versions CASCADE;
CREATE TABLE budget_versions (
    id SERIAL PRIMARY KEY,
    budget_year INTEGER,
    version_name VARCHAR(255),
    status VARCHAR(50),
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS budgets CASCADE;
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255),
    budget_period VARCHAR(50),
    budget_year INTEGER,
    budgeted_amount NUMERIC,
    actual_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS bus_fare_records CASCADE;
CREATE TABLE bus_fare_records (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100),
    employee_name VARCHAR(255),
    travel_date DATE,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    amount NUMERIC,
    purpose TEXT,
    receipt_number VARCHAR(100),
    status VARCHAR(50),
    approved_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS capacity_alerts CASCADE;
CREATE TABLE capacity_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100),
    severity VARCHAR(50),
    threshold_value NUMERIC,
    current_value NUMERIC,
    status VARCHAR(50),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS capacity_predictions CASCADE;
CREATE TABLE capacity_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE,
    predicted_capacity BIGINT,
    confidence_level NUMERIC,
    model_version VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS card_transactions CASCADE;
CREATE TABLE card_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER,
    processor VARCHAR(100),
    transaction_id VARCHAR(255),
    card_last_four VARCHAR(4),
    amount NUMERIC,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50),
    processor_response JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS cash_flow_categories CASCADE;
CREATE TABLE cash_flow_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category_type VARCHAR(50),
    is_inflow BOOLEAN,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS cash_flow_transactions CASCADE;
CREATE TABLE cash_flow_transactions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER,
    transaction_date DATE,
    amount NUMERIC,
    description TEXT,
    reference_type VARCHAR(100),
    reference_id INTEGER,
    bank_account VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS cash_transactions CASCADE;
CREATE TABLE cash_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER,
    transaction_id VARCHAR(255),
    amount NUMERIC,
    received_by VARCHAR(255),
    notes TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS chart_of_accounts CASCADE;
CREATE TABLE chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE,
    account_name VARCHAR(255),
    account_type VARCHAR(100),
    parent_account_id INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS communication_settings CASCADE;
CREATE TABLE communication_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(100),
    provider VARCHAR(100),
    api_key TEXT,
    sender_id VARCHAR(50),
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS company_content CASCADE;
CREATE TABLE company_content (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(100),
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS company_profiles CASCADE;
CREATE TABLE company_profiles (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    business_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    established_date DATE,
    industry VARCHAR(100),
    description TEXT,
    logo_url TEXT,
    currency VARCHAR(10) DEFAULT 'KES',
    timezone VARCHAR(100),
    date_format VARCHAR(50),
    time_format VARCHAR(50),
    number_format VARCHAR(50),
    default_language VARCHAR(10) DEFAULT 'en',
    company_prefix VARCHAR(20),
    week_start VARCHAR(10),
    tax_rate NUMERIC,
    tax_system VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS connection_methods CASCADE;
CREATE TABLE connection_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(255),
    description TEXT,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS credit_applications CASCADE;
CREATE TABLE credit_applications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    invoice_id INTEGER,
    adjustment_id INTEGER,
    amount_applied NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS credit_notes CASCADE;
CREATE TABLE credit_notes (
    id SERIAL PRIMARY KEY,
    credit_note_number VARCHAR(255),
    customer_id INTEGER,
    invoice_id INTEGER,
    amount NUMERIC,
    reason TEXT,
    notes TEXT,
    status VARCHAR(50),
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_billing_configurations CASCADE;
CREATE TABLE customer_billing_configurations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    billing_cycle VARCHAR(50),
    billing_day INTEGER,
    payment_terms INTEGER,
    custom_payment_terms TEXT,
    auto_generate_invoices BOOLEAN DEFAULT true,
    auto_send_invoices BOOLEAN DEFAULT true,
    auto_send_reminders BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 3,
    reminder_days_after INTEGER DEFAULT 7,
    overdue_threshold_days INTEGER DEFAULT 30,
    grace_period_days INTEGER DEFAULT 7,
    auto_suspend_on_overdue BOOLEAN DEFAULT false,
    late_fee_type VARCHAR(50),
    late_fee_amount NUMERIC,
    notification_methods JSONB,
    notification_email VARCHAR(255),
    notification_phone VARCHAR(50),
    custom_invoice_template VARCHAR(255),
    billing_notes TEXT,
    tax_exempt BOOLEAN DEFAULT false,
    tax_rate NUMERIC,
    tax_inclusive BOOLEAN DEFAULT false,
    credit_limit NUMERIC,
    pro_rata_enabled BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_document_access_logs CASCADE;
CREATE TABLE customer_document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER,
    user_id INTEGER,
    action VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_document_shares CASCADE;
CREATE TABLE customer_document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER,
    shared_by INTEGER,
    shared_with_email VARCHAR(255),
    share_token VARCHAR(255),
    access_level VARCHAR(50),
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_documents CASCADE;
CREATE TABLE customer_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    document_type VARCHAR(100),
    document_name VARCHAR(255),
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    description TEXT,
    version INTEGER DEFAULT 1,
    parent_document_id INTEGER,
    uploaded_by INTEGER,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    tags TEXT[],
    is_confidential BOOLEAN DEFAULT false,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_emergency_contacts CASCADE;
CREATE TABLE customer_emergency_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    name VARCHAR(255),
    relationship VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_equipment CASCADE;
CREATE TABLE customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    inventory_item_id INTEGER,
    inventory_serial_number_id INTEGER,
    equipment_type VARCHAR(100),
    equipment_name VARCHAR(255),
    serial_number VARCHAR(255),
    mac_address VARCHAR(50),
    ip_address INET,
    status VARCHAR(50),
    issued_date DATE,
    assigned_date DATE,
    returned_date DATE,
    return_reason TEXT,
    return_condition VARCHAR(50),
    monthly_cost NUMERIC,
    notes TEXT,
    verified_serial_match BOOLEAN,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_notes CASCADE;
CREATE TABLE customer_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    note_type VARCHAR(100),
    subject VARCHAR(255),
    content TEXT,
    is_important BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_notifications CASCADE;
CREATE TABLE customer_notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_payment_accounts CASCADE;
CREATE TABLE customer_payment_accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    type VARCHAR(100),
    title VARCHAR(255),
    account_details JSONB,
    field_1 VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_phone_numbers CASCADE;
CREATE TABLE customer_phone_numbers (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    phone_number VARCHAR(50),
    type VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customer_statements CASCADE;
CREATE TABLE customer_statements (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    statement_number VARCHAR(100),
    statement_date DATE,
    period_start DATE,
    period_end DATE,
    opening_balance NUMERIC,
    closing_balance NUMERIC,
    transaction_count INTEGER,
    status VARCHAR(50),
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    viewed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    customer_type VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    billing_address TEXT,
    installation_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    gps_coordinates VARCHAR(255),
    id_number VARCHAR(100),
    tax_number VARCHAR(100),
    location_id INTEGER,
    assigned_staff_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    portal_username VARCHAR(255),
    portal_password VARCHAR(255),
    referral_source VARCHAR(255),
    preferred_contact_method VARCHAR(50),
    service_preferences JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS email_logs CASCADE;
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    invoice_id INTEGER,
    email_type VARCHAR(100),
    recipient_email VARCHAR(255),
    subject VARCHAR(500),
    content TEXT,
    status VARCHAR(50),
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    opened_at TIMESTAMP WITHOUT TIME ZONE,
    clicked_at TIMESTAMP WITHOUT TIME ZONE,
    bounced_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(255),
    department VARCHAR(255),
    hire_date DATE,
    salary NUMERIC,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS equipment_returns CASCADE;
CREATE TABLE equipment_returns (
    id SERIAL PRIMARY KEY,
    customer_equipment_id INTEGER,
    customer_id INTEGER,
    inventory_item_id INTEGER,
    inventory_serial_number_id INTEGER,
    serial_number VARCHAR(255),
    return_date TIMESTAMP WITHOUT TIME ZONE,
    return_condition VARCHAR(50),
    return_reason TEXT,
    issued_date DATE,
    days_in_use INTEGER,
    verified_serial_match BOOLEAN,
    processed_by INTEGER,
    supplier_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS expense_approvals CASCADE;
CREATE TABLE expense_approvals (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER,
    approver_id INTEGER,
    status VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS expense_categories CASCADE;
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    color VARCHAR(50),
    budget_amount NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS expense_subcategories CASCADE;
CREATE TABLE expense_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER,
    name VARCHAR(255),
    description TEXT,
    budget_allocation NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE,
    category_id INTEGER,
    amount NUMERIC,
    tax_amount NUMERIC,
    description TEXT,
    vendor VARCHAR(255),
    payment_method VARCHAR(100),
    receipt_url TEXT,
    status VARCHAR(50),
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(50),
    project_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS financial_adjustments CASCADE;
CREATE TABLE financial_adjustments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    invoice_id INTEGER,
    adjustment_type VARCHAR(100),
    amount NUMERIC,
    reason TEXT,
    reference_number VARCHAR(100),
    status VARCHAR(50),
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS financial_periods CASCADE;
CREATE TABLE financial_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(255),
    period_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS financial_reports CASCADE;
CREATE TABLE financial_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    report_period VARCHAR(50),
    period_start DATE,
    period_end DATE,
    report_data JSONB,
    generated_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS fuel_logs CASCADE;
CREATE TABLE fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER,
    log_date DATE,
    fuel_type VARCHAR(50),
    quantity NUMERIC,
    cost NUMERIC,
    odometer_reading INTEGER,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hotspot_sessions CASCADE;
CREATE TABLE hotspot_sessions (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER,
    user_id INTEGER,
    mac_address VARCHAR(50),
    ip_address INET,
    start_time TIMESTAMP WITHOUT TIME ZONE,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    data_used BIGINT,
    status VARCHAR(50)
);

DROP TABLE IF EXISTS hotspot_users CASCADE;
CREATE TABLE hotspot_users (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER,
    username VARCHAR(255),
    password VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    time_limit INTEGER,
    data_limit INTEGER,
    expiry_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hotspot_vouchers CASCADE;
CREATE TABLE hotspot_vouchers (
    id SERIAL PRIMARY KEY,
    hotspot_id INTEGER,
    code VARCHAR(255),
    time_limit INTEGER,
    data_limit INTEGER,
    max_users INTEGER,
    used_count INTEGER DEFAULT 0,
    expiry_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hotspots CASCADE;
CREATE TABLE hotspots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    location VARCHAR(255),
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    ssid VARCHAR(255),
    password VARCHAR(255),
    security_type VARCHAR(50),
    bandwidth_limit INTEGER,
    user_limit INTEGER,
    device_model VARCHAR(255),
    device_mac VARCHAR(50),
    ip_address INET,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS inventory_items CASCADE;
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    specifications TEXT,
    stock_quantity INTEGER DEFAULT 0,
    unit_cost NUMERIC,
    location VARCHAR(255),
    supplier_id UUID,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS inventory_serial_numbers CASCADE;
CREATE TABLE inventory_serial_numbers (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER,
    serial_number VARCHAR(255) UNIQUE,
    status VARCHAR(50),
    purchase_order_id INTEGER,
    supplier_id UUID,
    received_date DATE,
    assigned_date DATE,
    returned_date DATE,
    return_condition VARCHAR(50),
    customer_equipment_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS invoice_items CASCADE;
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC,
    total_price NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ip_pools CASCADE;
CREATE TABLE ip_pools (
    id SERIAL PRIMARY KEY,
    router_id INTEGER,
    ip_address INET,
    subnet_mask VARCHAR(50),
    gateway INET,
    status VARCHAR(50),
    customer_id INTEGER,
    allocated_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS journal_entries CASCADE;
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(100),
    entry_date DATE,
    reference_type VARCHAR(100),
    reference_id INTEGER,
    description TEXT,
    total_debit NUMERIC DEFAULT 0,
    total_credit NUMERIC DEFAULT 0,
    status VARCHAR(50),
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS journal_entry_lines CASCADE;
CREATE TABLE journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER,
    line_number INTEGER,
    account_id INTEGER,
    description TEXT,
    debit_amount NUMERIC DEFAULT 0,
    credit_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS knowledge_base CASCADE;
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500),
    content TEXT,
    category VARCHAR(100),
    tags TEXT[],
    author_id INTEGER,
    views INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS loyalty_redemptions CASCADE;
CREATE TABLE loyalty_redemptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    points_redeemed INTEGER,
    redemption_type VARCHAR(100),
    redemption_value NUMERIC,
    wallet_credit_amount NUMERIC,
    applied_to_invoice INTEGER,
    applied_to_service INTEGER,
    description TEXT,
    status VARCHAR(50),
    processed_by INTEGER,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS loyalty_transactions CASCADE;
CREATE TABLE loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    transaction_type VARCHAR(100),
    points INTEGER,
    source_type VARCHAR(100),
    source_id INTEGER,
    description TEXT,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    metadata JSONB,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS maintenance_logs CASCADE;
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER,
    service_date DATE,
    service_type VARCHAR(100),
    description TEXT,
    cost NUMERIC,
    service_provider VARCHAR(255),
    odometer_reading INTEGER,
    parts_replaced TEXT,
    next_service_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS network_configurations CASCADE;
CREATE TABLE network_configurations (
    id SERIAL PRIMARY KEY,
    device_id INTEGER,
    ip_address INET,
    gateway INET,
    dns1 INET,
    dns2 INET,
    pppoe_enabled BOOLEAN DEFAULT false,
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    bandwidth_config JSONB,
    status VARCHAR(50),
    deployed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS notification_logs CASCADE;
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    invoice_id INTEGER,
    notification_type VARCHAR(100),
    channel VARCHAR(50),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS notification_templates CASCADE;
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255),
    template_type VARCHAR(100),
    subject VARCHAR(500),
    content TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS openvpn_configs CASCADE;
CREATE TABLE openvpn_configs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    router_id INTEGER,
    config_content TEXT,
    status VARCHAR(50),
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS payment_applications CASCADE;
CREATE TABLE payment_applications (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER,
    invoice_id INTEGER,
    amount_applied NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS payment_methods CASCADE;
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS payment_reminders CASCADE;
CREATE TABLE payment_reminders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    amount NUMERIC,
    due_date DATE,
    reminder_type VARCHAR(100),
    status VARCHAR(50),
    sent_at TIMESTAMP WITHOUT TIME ZONE
);

DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    permission_name VARCHAR(255),
    permission_key VARCHAR(255),
    module VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS portal_sessions CASCADE;
CREATE TABLE portal_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    session_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    last_activity TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS purchase_order_items CASCADE;
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER,
    inventory_item_id INTEGER,
    quantity INTEGER,
    unit_cost NUMERIC,
    total_cost NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS purchase_orders CASCADE;
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100),
    supplier_id UUID,
    total_amount NUMERIC,
    status VARCHAR(50),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS refunds CASCADE;
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    adjustment_id INTEGER,
    amount NUMERIC,
    refund_method VARCHAR(100),
    transaction_reference VARCHAR(255),
    status VARCHAR(50),
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS revenue_categories CASCADE;
CREATE TABLE revenue_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS revenue_streams CASCADE;
CREATE TABLE revenue_streams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category_id INTEGER,
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER,
    permission_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS router_services CASCADE;
CREATE TABLE router_services (
    id SERIAL PRIMARY KEY,
    router_id INTEGER,
    service_type VARCHAR(100),
    configuration JSONB,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS routers CASCADE;
CREATE TABLE routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    firmware_version VARCHAR(100),
    location_id INTEGER,
    ip_address INET,
    username VARCHAR(255),
    password VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    connection_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    sync_status VARCHAR(50),
    last_sync TIMESTAMP WITHOUT TIME ZONE,
    last_seen TIMESTAMP WITHOUT TIME ZONE,
    sync_error TEXT,
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    temperature NUMERIC,
    uptime BIGINT,
    configuration JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS service_activation_logs CASCADE;
CREATE TABLE service_activation_logs (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    customer_id INTEGER,
    action VARCHAR(100),
    status VARCHAR(50),
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS service_inventory CASCADE;
CREATE TABLE service_inventory (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    inventory_id INTEGER,
    status VARCHAR(50),
    assigned_at TIMESTAMP WITHOUT TIME ZONE,
    returned_at TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT
);

DROP TABLE IF EXISTS service_requests CASCADE;
CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    request_type VARCHAR(100),
    current_service_id INTEGER,
    requested_service_plan_id INTEGER,
    description TEXT,
    status VARCHAR(50),
    notes TEXT,
    requested_at TIMESTAMP WITHOUT TIME ZONE,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    processed_by INTEGER
);

DROP TABLE IF EXISTS sms_logs CASCADE;
CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    invoice_id INTEGER,
    sms_type VARCHAR(100),
    recipient_phone VARCHAR(50),
    message TEXT,
    provider VARCHAR(100),
    message_id VARCHAR(255),
    status VARCHAR(50),
    cost NUMERIC,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    failed_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS subnets CASCADE;
CREATE TABLE subnets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    network CIDR,
    gateway INET,
    router_id INTEGER,
    dns_servers INET[],
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS supplier_invoice_items CASCADE;
CREATE TABLE supplier_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    inventory_item_id INTEGER,
    description TEXT,
    quantity INTEGER,
    unit_cost NUMERIC,
    total_amount NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS supplier_invoices CASCADE;
CREATE TABLE supplier_invoices (
    id SERIAL PRIMARY KEY,
    supplier_id UUID,
    invoice_number VARCHAR(100),
    purchase_order_id INTEGER,
    invoice_date DATE,
    due_date DATE,
    subtotal NUMERIC,
    tax_amount NUMERIC,
    total_amount NUMERIC,
    paid_amount NUMERIC DEFAULT 0,
    status VARCHAR(50),
    payment_terms INTEGER,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS suppliers CASCADE;
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    tax_id TEXT,
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS support_tickets CASCADE;
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(100),
    customer_id INTEGER,
    subject VARCHAR(500),
    title VARCHAR(500),
    description TEXT,
    priority VARCHAR(50),
    status VARCHAR(50),
    assigned_to INTEGER,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS sync_jobs CASCADE;
CREATE TABLE sync_jobs (
    id BIGSERIAL PRIMARY KEY,
    router_id BIGINT,
    job_type VARCHAR(100),
    status VARCHAR(50),
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS system_config CASCADE;
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE,
    value TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tax_configurations CASCADE;
CREATE TABLE tax_configurations (
    id SERIAL PRIMARY KEY,
    tax_name VARCHAR(255),
    tax_type VARCHAR(100),
    tax_rate NUMERIC,
    applies_to VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tax_periods CASCADE;
CREATE TABLE tax_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tax_returns CASCADE;
CREATE TABLE tax_returns (
    id SERIAL PRIMARY KEY,
    period_id INTEGER,
    return_type VARCHAR(100),
    tax_authority VARCHAR(255),
    total_revenue NUMERIC,
    total_expenses NUMERIC,
    taxable_income NUMERIC,
    tax_due NUMERIC,
    penalty_amount NUMERIC,
    filed_date DATE,
    due_date DATE,
    reference_number VARCHAR(100),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS trial_balance_view CASCADE;
CREATE TABLE trial_balance_view (
    account_id INTEGER,
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    account_type VARCHAR(100),
    debit_total NUMERIC,
    credit_total NUMERIC,
    balance NUMERIC
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(500),
    role VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS vehicles CASCADE;
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    registration VARCHAR(100),
    model VARCHAR(255),
    year INTEGER,
    fuel_type VARCHAR(50),
    fuel_consumption NUMERIC,
    mileage INTEGER,
    status VARCHAR(50),
    purchase_date DATE,
    purchase_cost NUMERIC,
    assigned_to VARCHAR(255),
    location VARCHAR(255),
    last_service DATE,
    next_service DATE,
    insurance_expiry DATE,
    license_expiry DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS wallet_balances CASCADE;
CREATE TABLE wallet_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER UNIQUE,
    current_balance NUMERIC DEFAULT 0,
    total_topups NUMERIC DEFAULT 0,
    total_bonuses NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_topup_date TIMESTAMP WITHOUT TIME ZONE,
    last_transaction_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS wallet_bonus_rules CASCADE;
CREATE TABLE wallet_bonus_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255),
    description TEXT,
    target_customer_type VARCHAR(100),
    topup_min_amount NUMERIC,
    bonus_fixed_amount NUMERIC,
    bonus_percentage NUMERIC,
    max_bonus_amount NUMERIC,
    points_per_amount NUMERIC,
    points_awarded INTEGER,
    valid_from TIMESTAMP WITHOUT TIME ZONE,
    valid_until TIMESTAMP WITHOUT TIME ZONE,
    max_uses_per_customer INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS wallet_transactions CASCADE;
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    transaction_type VARCHAR(100),
    amount NUMERIC,
    balance_before NUMERIC,
    balance_after NUMERIC,
    source_type VARCHAR(100),
    source_id INTEGER,
    reference_number VARCHAR(100),
    description TEXT,
    metadata JSONB,
    processed_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS warehouses CASCADE;
CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255),
    location VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_location_id ON routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
