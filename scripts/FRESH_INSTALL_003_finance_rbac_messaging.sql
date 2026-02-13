-- =====================================================================
-- ISP Management System - FRESH INSTALL Part 3: Finance, RBAC, Messaging, Support
-- Creates: expense_categories, expenses, chart_of_accounts, journal_entries,
--          budget, financial_reports, credit_notes, refunds, users, roles,
--          permissions, messages, tasks, support_tickets, etc.
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================================

-- =====================================================================
-- FINANCE TABLES
-- =====================================================================

-- 1. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    budget_amount DECIMAL(12,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor VARCHAR(255),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank',
    status VARCHAR(50) DEFAULT 'paid',
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Expense Approvals
CREATE TABLE IF NOT EXISTS expense_approvals (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER,
    approver_id INTEGER,
    approval_level INTEGER,
    approved_amount DECIMAL(10,2),
    comments TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Expense Subcategories
CREATE TABLE IF NOT EXISTS expense_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget_allocation DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id INTEGER REFERENCES chart_of_accounts(id),
    parent_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'posted',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    line_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Revenue Categories
CREATE TABLE IF NOT EXISTS revenue_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Revenue Streams
CREATE TABLE IF NOT EXISTS revenue_streams (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES revenue_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    year INTEGER,
    period_number INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50),
    report_data JSONB,
    generated_by INTEGER,
    file_path TEXT,
    status VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Cash Flow Categories
CREATE TABLE IF NOT EXISTS cash_flow_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    is_inflow BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Cash Flow Transactions
CREATE TABLE IF NOT EXISTS cash_flow_transactions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES cash_flow_categories(id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    bank_account VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Tax Periods
CREATE TABLE IF NOT EXISTS tax_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Tax Returns
CREATE TABLE IF NOT EXISTS tax_returns (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES tax_periods(id),
    return_type VARCHAR(50) NOT NULL,
    total_revenue DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    taxable_income DECIMAL(15,2),
    tax_due DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'draft',
    filed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Tax Records
CREATE TABLE IF NOT EXISTS tax_records (
    id SERIAL PRIMARY KEY,
    tax_type VARCHAR(50) NOT NULL,
    tax_name VARCHAR(100),
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    applies_to VARCHAR(50) DEFAULT 'all',
    period VARCHAR(50),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Budget Versions
CREATE TABLE IF NOT EXISTS budget_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(100) NOT NULL,
    budget_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Budget Line Items
CREATE TABLE IF NOT EXISTS budget_line_items (
    id SERIAL PRIMARY KEY,
    version_id INTEGER REFERENCES budget_versions(id),
    category_id INTEGER REFERENCES expense_categories(id),
    subcategory_id INTEGER REFERENCES expense_subcategories(id),
    line_item_name VARCHAR(200) NOT NULL,
    budgeted_amount DECIMAL(12,2) NOT NULL,
    quarter_1 DECIMAL(12,2),
    quarter_2 DECIMAL(12,2),
    quarter_3 DECIMAL(12,2),
    quarter_4 DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Budgets (legacy)
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    period VARCHAR(50),
    amount DECIMAL(15,2),
    spent DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Credit Notes
CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP
);

-- 21. Credit Applications
CREATE TABLE IF NOT EXISTS credit_applications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    adjustment_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    amount_applied NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Refunds
CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_id INTEGER,
    adjustment_id INTEGER REFERENCES credit_notes(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    refund_method VARCHAR(50),
    refund_reference VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    notes TEXT
);

-- 23. Finance Audit Trail
CREATE TABLE IF NOT EXISTS finance_audit_trail (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100),
    action_type VARCHAR(50),
    entity_type VARCHAR(100),
    entity_id INTEGER,
    user_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Finance Documents
CREATE TABLE IF NOT EXISTS finance_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50),
    document_number VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 26. Payment Gateway Configs
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(100) NOT NULL,
    provider VARCHAR(100),
    api_key TEXT,
    secret_key TEXT,
    webhook_url TEXT,
    is_sandbox BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. Customer Payment Accounts
CREATE TABLE IF NOT EXISTS customer_payment_accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    payment_method VARCHAR(50),
    account_number VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- RBAC TABLES
-- =====================================================================

-- 28. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    role_id INTEGER,
    employee_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(100) NOT NULL,
    permission_key VARCHAR(200) NOT NULL UNIQUE,
    permission_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 32. User Roles (legacy)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL,
    hierarchy_level INTEGER DEFAULT 0,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 33. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 34. Auth Logs
CREATE TABLE IF NOT EXISTS auth_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- MESSAGING TABLES
-- =====================================================================

-- 35. Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    body TEXT,
    variables TEXT,
    template_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 36. Messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50),
    recipient_id INTEGER,
    recipient_type VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message TEXT,
    template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    cost NUMERIC(15,2),
    metadata JSONB,
    scheduled_at TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 37. Message Campaigns
CREATE TABLE IF NOT EXISTS message_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    template_id INTEGER REFERENCES message_templates(id),
    channel VARCHAR(50),
    target_audience VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 38. Communication Settings
CREATE TABLE IF NOT EXISTS communication_settings (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100),
    channel VARCHAR(50),
    api_key TEXT,
    sender_id VARCHAR(50),
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- TASK MANAGEMENT TABLES
-- =====================================================================

-- 39. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER,
    assigned_by INTEGER,
    created_by INTEGER,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    due_date DATE,
    progress INTEGER DEFAULT 0,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    tags TEXT,
    attachments JSONB,
    related_type VARCHAR(100),
    related_id INTEGER,
    notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 40. Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    author VARCHAR(255),
    user_id INTEGER,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 41. Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    filename VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 42. Task Notifications
CREATE TABLE IF NOT EXISTS task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    recipient_id INTEGER,
    type VARCHAR(50),
    message TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 43. Task Performance Metrics
CREATE TABLE IF NOT EXISTS task_performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255),
    metric_value DECIMAL(10,2),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 44. Task Categories
CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 45. Pending Tasks
CREATE TABLE IF NOT EXISTS pending_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- =====================================================================
-- SUPPORT TABLES
-- =====================================================================

-- 46. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(500),
    subject VARCHAR(500),
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    category VARCHAR(100),
    source VARCHAR(50) DEFAULT 'web',
    assigned_to INTEGER,
    created_by INTEGER,
    tags TEXT,
    resolution_notes TEXT,
    satisfaction_rating INTEGER,
    notes TEXT,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 47. Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    feedback_type VARCHAR(50) DEFAULT 'service',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- 48. Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    category VARCHAR(100),
    tags TEXT,
    is_public BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- SETTINGS TABLES
-- =====================================================================

-- 49. Company Profiles
CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT 'My ISP Company',
    company_name VARCHAR(255),
    trading_name VARCHAR(255),
    company_trading_name VARCHAR(255),
    registration_number VARCHAR(100),
    company_registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    company_tax_number VARCHAR(100),
    description TEXT,
    company_description TEXT,
    industry VARCHAR(100) DEFAULT 'telecommunications',
    company_industry VARCHAR(100) DEFAULT 'telecommunications',
    company_size VARCHAR(50) DEFAULT 'medium',
    founded_year INTEGER,
    company_founded_year INTEGER,
    established_date DATE,
    logo TEXT,
    favicon TEXT,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    accent_color VARCHAR(7) DEFAULT '#16a34a',
    branding_primary_color VARCHAR(7) DEFAULT '#3b82f6',
    branding_secondary_color VARCHAR(7) DEFAULT '#64748b',
    branding_accent_color VARCHAR(7) DEFAULT '#16a34a',
    slogan VARCHAR(255),
    physical_address TEXT,
    postal_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',
    postal_code VARCHAR(20),
    contact_city VARCHAR(100),
    contact_state VARCHAR(100),
    contact_postal_code VARCHAR(20),
    contact_country VARCHAR(100) DEFAULT 'Kenya',
    main_phone VARCHAR(20),
    phone VARCHAR(50),
    support_phone VARCHAR(20),
    contact_secondary_phone VARCHAR(20),
    main_email VARCHAR(255),
    email VARCHAR(255),
    support_email VARCHAR(255),
    contact_support_email VARCHAR(255),
    website VARCHAR(255),
    fax VARCHAR(20),
    social_facebook VARCHAR(255),
    contact_facebook VARCHAR(255),
    social_twitter VARCHAR(255),
    contact_twitter VARCHAR(255),
    social_linkedin VARCHAR(255),
    contact_linkedin VARCHAR(255),
    social_instagram VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    default_language VARCHAR(10) DEFAULT 'en',
    localization_language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'KES',
    localization_currency VARCHAR(10) DEFAULT 'KES',
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    localization_timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    localization_date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    time_format VARCHAR(10) DEFAULT '24h',
    localization_time_format VARCHAR(10) DEFAULT '24h',
    number_format VARCHAR(20) DEFAULT 'comma',
    localization_number_format VARCHAR(20) DEFAULT 'comma',
    decimal_separator VARCHAR(1) DEFAULT '.',
    thousand_separator VARCHAR(1) DEFAULT ',',
    currency_position VARCHAR(10) DEFAULT 'before',
    fiscal_year_start VARCHAR(20) DEFAULT 'january',
    week_start VARCHAR(10) DEFAULT 'monday',
    localization_week_start VARCHAR(10) DEFAULT 'monday',
    company_prefix VARCHAR(10),
    tax_system VARCHAR(50) DEFAULT 'vat',
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 50. Portal Settings
CREATE TABLE IF NOT EXISTS portal_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 51. Automation Workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    trigger_type VARCHAR(100),
    trigger_conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 52. Server Configurations
CREATE TABLE IF NOT EXISTS server_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    host VARCHAR(255),
    port INTEGER,
    configuration JSONB,
    status VARCHAR(50) DEFAULT 'active',
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 53. Document Storage
CREATE TABLE IF NOT EXISTS document_storage (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record migration
INSERT INTO schema_migrations (filename) VALUES ('FRESH_INSTALL_003_finance_rbac_messaging.sql') ON CONFLICT (filename) DO NOTHING;
