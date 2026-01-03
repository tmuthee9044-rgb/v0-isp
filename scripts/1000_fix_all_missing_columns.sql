-- Comprehensive fix for all 28 tables with incorrect column counts
-- This script adds ALL missing columns based on the complete schema

-- Fix customer_services table
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Fix network_devices table
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 8728;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_port INTEGER DEFAULT 8728;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS connection_method VARCHAR(50) DEFAULT 'api';
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS nas_ip_address VARCHAR(50);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_username VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS api_password VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS enable_traffic_recording BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS enable_speed_control BOOLEAN DEFAULT true;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS blocking_page_url TEXT;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS configuration JSONB;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Fix company_profiles table (localization columns)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'comma';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'monday';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS decimal_separator VARCHAR(1) DEFAULT '.';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS thousand_separator VARCHAR(1) DEFAULT ',';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'before';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS fiscal_year_start VARCHAR(20) DEFAULT 'january';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_prefix VARCHAR(10);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_system VARCHAR(50) DEFAULT 'vat';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 16.00;

-- Fix radius_users table
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS download_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS upload_limit BIGINT;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS session_timeout INTEGER;
ALTER TABLE radius_users ADD COLUMN IF NOT EXISTS idle_timeout INTEGER;

-- Fix radius_sessions_active table
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_in BIGINT DEFAULT 0;
ALTER TABLE radius_sessions_active ADD COLUMN IF NOT EXISTS packets_out BIGINT DEFAULT 0;

-- Fix radius_sessions_archive table  
ALTER TABLE radius_sessions_archive ADD COLUMN IF NOT EXISTS packets_in BIGINT;
ALTER TABLE radius_sessions_archive ADD COLUMN IF NOT EXISTS packets_out BIGINT;

-- Fix radius_nas table
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS short_name VARCHAR(32);
ALTER TABLE radius_nas ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'mikrotik';

-- Fix routers table
ALTER TABLE routers ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 8728;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS api_port INTEGER DEFAULT 8728;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS connection_method VARCHAR(50) DEFAULT 'api';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret VARCHAR(255);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS enable_traffic_recording BOOLEAN DEFAULT true;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS enable_speed_control BOOLEAN DEFAULT true;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS blocking_page_url TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS configuration JSONB;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Fix payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Fix customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_address VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_category VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_billing BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_documents JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Fix locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);

-- Fix tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Fix service_plans table
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS upload_speed INTEGER;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS limitations JSONB;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Fix ip_addresses table  
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS subnet VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS dns_primary VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS dns_secondary VARCHAR(50);
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS vlan_id INTEGER;
ALTER TABLE ip_addresses ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Fix invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'service';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Fix payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS configuration JSONB;

-- Fix loyalty_transactions table
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS points_spent INTEGER DEFAULT 0;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS reference_id INTEGER;

-- Fix loyalty_redemptions table
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS points_required INTEGER NOT NULL;
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50);
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS reward_value DECIMAL(10,2);
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Fix financial_reports table
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(50);
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS report_data JSONB;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS generated_by INTEGER;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Fix chart_of_accounts table
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE CASCADE;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(50);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix financial_periods table
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS period_number INTEGER;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL;
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

-- Fix supplier_invoices table
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Fix customer_equipment table
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

-- Fix backup_settings table
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_type VARCHAR(50);
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_frequency VARCHAR(50);
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS backup_time TIME;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 30;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS storage_location TEXT;
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Fix refunds table
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id INTEGER;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(255);

-- Fix expense_approvals table
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS expense_id INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approver_id INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approval_level INTEGER;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(10,2);
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE expense_approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Fix capacity_predictions table
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS prediction_date DATE;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS predicted_bandwidth BIGINT;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS predicted_users INTEGER;
ALTER TABLE capacity_predictions ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2);

-- Fix bandwidth_patterns table
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS hour_of_day INTEGER;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS average_bandwidth BIGINT;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS peak_bandwidth BIGINT;
ALTER TABLE bandwidth_patterns ADD COLUMN IF NOT EXISTS user_count INTEGER;

-- Create router_sync_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS router_sync_status (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_message TEXT,
    customers_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create account_balances_old table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_balances_old (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create performance indexes for all new columns
CREATE INDEX IF NOT EXISTS idx_customer_services_mac ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_user ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_customer ON radius_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_nas_network_device ON radius_nas(network_device_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(customer_category);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_location ON ip_addresses(location_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_device ON capacity_predictions(network_device_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_patterns_device ON bandwidth_patterns(network_device_id);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_router ON router_sync_status(router_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_old_customer ON account_balances_old(customer_id);
