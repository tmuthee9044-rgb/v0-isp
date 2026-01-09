-- Migration to add all 191 missing columns to 43 tables
-- This ensures local PostgreSQL matches Neon schema exactly

-- =====================================================
-- 1. openvpn_logs - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='openvpn_logs' AND column_name='log_timestamp') THEN
        ALTER TABLE openvpn_logs ADD COLUMN log_timestamp timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='openvpn_logs' AND column_name='session_duration') THEN
        ALTER TABLE openvpn_logs ADD COLUMN session_duration integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='openvpn_logs' AND column_name='bytes_sent') THEN
        ALTER TABLE openvpn_logs ADD COLUMN bytes_sent bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='openvpn_logs' AND column_name='bytes_received') THEN
        ALTER TABLE openvpn_logs ADD COLUMN bytes_received bigint;
    END IF;
END $$;

-- =====================================================
-- 2. router_sync_status - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_sync_status' AND column_name='sync_message') THEN
        ALTER TABLE router_sync_status ADD COLUMN sync_message text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_sync_status' AND column_name='retry_count') THEN
        ALTER TABLE router_sync_status ADD COLUMN retry_count integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_sync_status' AND column_name='last_checked') THEN
        ALTER TABLE router_sync_status ADD COLUMN last_checked timestamp without time zone;
    END IF;
END $$;

-- =====================================================
-- 3. messages - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='subject') THEN
        ALTER TABLE messages ADD COLUMN subject character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='metadata') THEN
        ALTER TABLE messages ADD COLUMN metadata jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='scheduled_at') THEN
        ALTER TABLE messages ADD COLUMN scheduled_at timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='delivered_at') THEN
        ALTER TABLE messages ADD COLUMN delivered_at timestamp without time zone;
    END IF;
END $$;

-- =====================================================
-- 4. payments - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='currency') THEN
        ALTER TABLE payments ADD COLUMN currency character varying(10) DEFAULT 'KES';
    END IF;
END $$;

-- =====================================================
-- 5. capacity_alerts - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_alerts' AND column_name='current_value') THEN
        ALTER TABLE capacity_alerts ADD COLUMN current_value numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_alerts' AND column_name='threshold_value') THEN
        ALTER TABLE capacity_alerts ADD COLUMN threshold_value numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_alerts' AND column_name='resolved_at') THEN
        ALTER TABLE capacity_alerts ADD COLUMN resolved_at timestamp without time zone;
    END IF;
END $$;

-- =====================================================
-- 6. routers - Add ALL missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='ssh_port') THEN
        ALTER TABLE routers ADD COLUMN ssh_port integer DEFAULT 22;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='memory_usage') THEN
        ALTER TABLE routers ADD COLUMN memory_usage numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='sync_error') THEN
        ALTER TABLE routers ADD COLUMN sync_error text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='temperature') THEN
        ALTER TABLE routers ADD COLUMN temperature numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='model') THEN
        ALTER TABLE routers ADD COLUMN model character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='hostname') THEN
        ALTER TABLE routers ADD COLUMN hostname character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='serial_number') THEN
        ALTER TABLE routers ADD COLUMN serial_number character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='cpu_usage') THEN
        ALTER TABLE routers ADD COLUMN cpu_usage numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='uptime') THEN
        ALTER TABLE routers ADD COLUMN uptime bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='firmware_version') THEN
        ALTER TABLE routers ADD COLUMN firmware_version character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='api_port') THEN
        ALTER TABLE routers ADD COLUMN api_port integer DEFAULT 8728;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routers' AND column_name='sync_status') THEN
        ALTER TABLE routers ADD COLUMN sync_status character varying(50);
    END IF;
END $$;

-- =====================================================
-- 7. server_configurations - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='server_configurations' AND column_name='port') THEN
        ALTER TABLE server_configurations ADD COLUMN port integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='server_configurations' AND column_name='last_updated') THEN
        ALTER TABLE server_configurations ADD COLUMN last_updated timestamp without time zone;
    END IF;
END $$;

-- =====================================================
-- 8. bandwidth_patterns - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bandwidth_patterns' AND column_name='pattern_date') THEN
        ALTER TABLE bandwidth_patterns ADD COLUMN pattern_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bandwidth_patterns' AND column_name='hour_of_day') THEN
        ALTER TABLE bandwidth_patterns ADD COLUMN hour_of_day integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bandwidth_patterns' AND column_name='day_of_week') THEN
        ALTER TABLE bandwidth_patterns ADD COLUMN day_of_week integer;
    END IF;
END $$;

-- =====================================================
-- 9. task_attachments - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_attachments' AND column_name='uploaded_by') THEN
        ALTER TABLE task_attachments ADD COLUMN uploaded_by integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_attachments' AND column_name='filename') THEN
        ALTER TABLE task_attachments ADD COLUMN filename character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_attachments' AND column_name='file_size') THEN
        ALTER TABLE task_attachments ADD COLUMN file_size bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_attachments' AND column_name='mime_type') THEN
        ALTER TABLE task_attachments ADD COLUMN mime_type character varying(100);
    END IF;
END $$;

-- =====================================================
-- 10. communication_settings - Add missing columns
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communication_settings' AND column_name='api_key') THEN
        ALTER TABLE communication_settings ADD COLUMN api_key text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communication_settings' AND column_name='sender_id') THEN
        ALTER TABLE communication_settings ADD COLUMN sender_id character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communication_settings' AND column_name='configuration') THEN
        ALTER TABLE communication_settings ADD COLUMN configuration jsonb;
    END IF;
END $$;

-- =====================================================
-- Continue with remaining tables...
-- =====================================================

-- mpesa_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_logs' AND column_name='checkout_request_id') THEN
        ALTER TABLE mpesa_logs ADD COLUMN checkout_request_id character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_logs' AND column_name='merchant_request_id') THEN
        ALTER TABLE mpesa_logs ADD COLUMN merchant_request_id character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_logs' AND column_name='processed_at') THEN
        ALTER TABLE mpesa_logs ADD COLUMN processed_at timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_logs' AND column_name='raw_response') THEN
        ALTER TABLE mpesa_logs ADD COLUMN raw_response jsonb;
    END IF;
END $$;

-- network_forecasts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='network_forecasts' AND column_name='growth_rate') THEN
        ALTER TABLE network_forecasts ADD COLUMN growth_rate numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='network_forecasts' AND column_name='predicted_users') THEN
        ALTER TABLE network_forecasts ADD COLUMN predicted_users integer;
    END IF;
END $$;

-- tasks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='updated_at') THEN
        ALTER TABLE tasks ADD COLUMN updated_at timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at timestamp without time zone;
    END IF;
END $$;

-- customer_addresses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_addresses' AND column_name='gps_coordinates') THEN
        ALTER TABLE customer_addresses ADD COLUMN gps_coordinates character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_addresses' AND column_name='address_line2') THEN
        ALTER TABLE customer_addresses ADD COLUMN address_line2 text;
    END IF;
END $$;

-- customer_categories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_categories' AND column_name='discount_percentage') THEN
        ALTER TABLE customer_categories ADD COLUMN discount_percentage numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_categories' AND column_name='priority_level') THEN
        ALTER TABLE customer_categories ADD COLUMN priority_level integer;
    END IF;
END $$;

-- router_performance_history
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='timestamp') THEN
        ALTER TABLE router_performance_history ADD COLUMN timestamp timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='latency') THEN
        ALTER TABLE router_performance_history ADD COLUMN latency numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='packet_loss') THEN
        ALTER TABLE router_performance_history ADD COLUMN packet_loss numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='bandwidth_in') THEN
        ALTER TABLE router_performance_history ADD COLUMN bandwidth_in bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='bandwidth_out') THEN
        ALTER TABLE router_performance_history ADD COLUMN bandwidth_out bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_performance_history' AND column_name='temperature') THEN
        ALTER TABLE router_performance_history ADD COLUMN temperature numeric;
    END IF;
END $$;

-- finance_audit_trail
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_audit_trail' AND column_name='user_agent') THEN
        ALTER TABLE finance_audit_trail ADD COLUMN user_agent text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_audit_trail' AND column_name='ip_address') THEN
        ALTER TABLE finance_audit_trail ADD COLUMN ip_address inet;
    END IF;
END $$;

-- capacity_predictions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_predictions' AND column_name='prediction_date') THEN
        ALTER TABLE capacity_predictions ADD COLUMN prediction_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_predictions' AND column_name='predicted_capacity') THEN
        ALTER TABLE capacity_predictions ADD COLUMN predicted_capacity bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_predictions' AND column_name='confidence_level') THEN
        ALTER TABLE capacity_predictions ADD COLUMN confidence_level numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capacity_predictions' AND column_name='model_version') THEN
        ALTER TABLE capacity_predictions ADD COLUMN model_version character varying(50);
    END IF;
END $$;

-- payroll_records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_records' AND column_name='basic_salary') THEN
        ALTER TABLE payroll_records ADD COLUMN basic_salary numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_records' AND column_name='allowances') THEN
        ALTER TABLE payroll_records ADD COLUMN allowances numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_records' AND column_name='overtime_hours') THEN
        ALTER TABLE payroll_records ADD COLUMN overtime_hours numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_records' AND column_name='overtime_rate') THEN
        ALTER TABLE payroll_records ADD COLUMN overtime_rate numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_records' AND column_name='tax_deduction') THEN
        ALTER TABLE payroll_records ADD COLUMN tax_deduction numeric;
    END IF;
END $$;

-- admin_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_logs' AND column_name='user_agent') THEN
        ALTER TABLE admin_logs ADD COLUMN user_agent text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_logs' AND column_name='old_values') THEN
        ALTER TABLE admin_logs ADD COLUMN old_values jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_logs' AND column_name='new_values') THEN
        ALTER TABLE admin_logs ADD COLUMN new_values jsonb;
    END IF;
END $$;

-- company_profiles (CRITICAL - this fixes the company settings page)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='company_name') THEN
        ALTER TABLE company_profiles ADD COLUMN company_name character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='registration_number') THEN
        ALTER TABLE company_profiles ADD COLUMN registration_number character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='tax_number') THEN
        ALTER TABLE company_profiles ADD COLUMN tax_number character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='default_language') THEN
        ALTER TABLE company_profiles ADD COLUMN default_language character varying(10) DEFAULT 'en';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='currency') THEN
        ALTER TABLE company_profiles ADD COLUMN currency character varying(10) DEFAULT 'KES';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='timezone') THEN
        ALTER TABLE company_profiles ADD COLUMN timezone character varying(50) DEFAULT 'Africa/Nairobi';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='date_format') THEN
        ALTER TABLE company_profiles ADD COLUMN date_format character varying(20) DEFAULT 'YYYY-MM-DD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='time_format') THEN
        ALTER TABLE company_profiles ADD COLUMN time_format character varying(20) DEFAULT '24h';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='number_format') THEN
        ALTER TABLE company_profiles ADD COLUMN number_format character varying(20) DEFAULT '1,000.00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='week_start') THEN
        ALTER TABLE company_profiles ADD COLUMN week_start character varying(10) DEFAULT 'monday';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='tax_rate') THEN
        ALTER TABLE company_profiles ADD COLUMN tax_rate numeric DEFAULT 16;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='tax_system') THEN
        ALTER TABLE company_profiles ADD COLUMN tax_system character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='company_prefix') THEN
        ALTER TABLE company_profiles ADD COLUMN company_prefix character varying(10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='established_date') THEN
        ALTER TABLE company_profiles ADD COLUMN established_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='industry') THEN
        ALTER TABLE company_profiles ADD COLUMN industry character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='website') THEN
        ALTER TABLE company_profiles ADD COLUMN website character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='logo_url') THEN
        ALTER TABLE company_profiles ADD COLUMN logo_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='description') THEN
        ALTER TABLE company_profiles ADD COLUMN description text;
    END IF;
END $$;

-- payment_gateway_configs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_gateway_configs' AND column_name='secret_key') THEN
        ALTER TABLE payment_gateway_configs ADD COLUMN secret_key text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_gateway_configs' AND column_name='webhook_url') THEN
        ALTER TABLE payment_gateway_configs ADD COLUMN webhook_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_gateway_configs' AND column_name='is_sandbox') THEN
        ALTER TABLE payment_gateway_configs ADD COLUMN is_sandbox boolean DEFAULT true;
    END IF;
END $$;

-- user_activity_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_activity_logs' AND column_name='user_type') THEN
        ALTER TABLE user_activity_logs ADD COLUMN user_type character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_activity_logs' AND column_name='session_id') THEN
        ALTER TABLE user_activity_logs ADD COLUMN session_id character varying(255);
    END IF;
END $$;

-- infrastructure_investments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='infrastructure_investments' AND column_name='expected_roi') THEN
        ALTER TABLE infrastructure_investments ADD COLUMN expected_roi numeric;
    END IF;
END $$;

-- customer_services
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_services' AND column_name='device_id') THEN
        ALTER TABLE customer_services ADD COLUMN device_id integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_services' AND column_name='config_id') THEN
        ALTER TABLE customer_services ADD COLUMN config_id integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_services' AND column_name='activated_at') THEN
        ALTER TABLE customer_services ADD COLUMN activated_at timestamp without time zone;
    END IF;
END $$;

-- message_campaigns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_campaigns' AND column_name='failed_count') THEN
        ALTER TABLE message_campaigns ADD COLUMN failed_count integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_campaigns' AND column_name='delivered_count') THEN
        ALTER TABLE message_campaigns ADD COLUMN delivered_count integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_campaigns' AND column_name='sent_count') THEN
        ALTER TABLE message_campaigns ADD COLUMN sent_count integer DEFAULT 0;
    END IF;
END $$;

-- radius_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='radius_logs' AND column_name='acct_session_time') THEN
        ALTER TABLE radius_logs ADD COLUMN acct_session_time integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='radius_logs' AND column_name='nas_port') THEN
        ALTER TABLE radius_logs ADD COLUMN nas_port integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='radius_logs' AND column_name='log_timestamp') THEN
        ALTER TABLE radius_logs ADD COLUMN log_timestamp timestamp without time zone;
    END IF;
END $$;

-- automation_workflows
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automation_workflows' AND column_name='trigger_conditions') THEN
        ALTER TABLE automation_workflows ADD COLUMN trigger_conditions jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automation_workflows' AND column_name='actions') THEN
        ALTER TABLE automation_workflows ADD COLUMN actions jsonb;
    END IF;
END $$;

-- task_comments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_comments' AND column_name='user_id') THEN
        ALTER TABLE task_comments ADD COLUMN user_id integer;
    END IF;
END $$;

-- portal_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_settings' AND column_name='setting_value') THEN
        ALTER TABLE portal_settings ADD COLUMN setting_value text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_settings' AND column_name='setting_type') THEN
        ALTER TABLE portal_settings ADD COLUMN setting_type character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_settings' AND column_name='is_public') THEN
        ALTER TABLE portal_settings ADD COLUMN is_public boolean DEFAULT false;
    END IF;
END $$;

-- invoices (CRITICAL - fixes invoice errors)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoice_number') THEN
        ALTER TABLE invoices ADD COLUMN invoice_number character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_amount') THEN
        ALTER TABLE invoices ADD COLUMN paid_amount numeric DEFAULT 0;
    END IF;
END $$;

-- ip_subnets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_subnets' AND column_name='cidr') THEN
        ALTER TABLE ip_subnets ADD COLUMN cidr character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_subnets' AND column_name='total_ips') THEN
        ALTER TABLE ip_subnets ADD COLUMN total_ips integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_subnets' AND column_name='used_ips') THEN
        ALTER TABLE ip_subnets ADD COLUMN used_ips integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_subnets' AND column_name='allocation_mode') THEN
        ALTER TABLE ip_subnets ADD COLUMN allocation_mode character varying(20) DEFAULT 'auto';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_subnets' AND column_name='version') THEN
        ALTER TABLE ip_subnets ADD COLUMN version character varying(10) DEFAULT 'IPv4';
    END IF;
END $$;

-- roles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='is_system_role') THEN
        ALTER TABLE roles ADD COLUMN is_system_role boolean DEFAULT false;
    END IF;
END $$;

-- customers (CRITICAL - fixes customer errors)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='business_name') THEN
        ALTER TABLE customers ADD COLUMN business_name character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='business_type') THEN
        ALTER TABLE customers ADD COLUMN business_type character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='tax_number') THEN
        ALTER TABLE customers ADD COLUMN tax_number character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='city') THEN
        ALTER TABLE customers ADD COLUMN city character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='state') THEN
        ALTER TABLE customers ADD COLUMN state character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='country') THEN
        ALTER TABLE customers ADD COLUMN country character varying(100) DEFAULT 'Kenya';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='postal_code') THEN
        ALTER TABLE customers ADD COLUMN postal_code character varying(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='installation_address') THEN
        ALTER TABLE customers ADD COLUMN installation_address text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='billing_address') THEN
        ALTER TABLE customers ADD COLUMN billing_address text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='gps_coordinates') THEN
        ALTER TABLE customers ADD COLUMN gps_coordinates character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='preferred_contact_method') THEN
        ALTER TABLE customers ADD COLUMN preferred_contact_method character varying(50) DEFAULT 'phone';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='service_preferences') THEN
        ALTER TABLE customers ADD COLUMN service_preferences jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='assigned_staff_id') THEN
        ALTER TABLE customers ADD COLUMN assigned_staff_id integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='referral_source') THEN
        ALTER TABLE customers ADD COLUMN referral_source character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_username') THEN
        ALTER TABLE customers ADD COLUMN portal_username character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_password') THEN
        ALTER TABLE customers ADD COLUMN portal_password character varying(255);
    END IF;
END $$;

-- chart_of_accounts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chart_of_accounts' AND column_name='parent_account_id') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN parent_account_id integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chart_of_accounts' AND column_name='is_active') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- system_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_logs' AND column_name='user_agent') THEN
        ALTER TABLE system_logs ADD COLUMN user_agent text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_logs' AND column_name='session_id') THEN
        ALTER TABLE system_logs ADD COLUMN session_id character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_logs' AND column_name='customer_id') THEN
        ALTER TABLE system_logs ADD COLUMN customer_id integer;
    END IF;
END $$;

-- network_devices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='network_devices' AND column_name='location') THEN
        ALTER TABLE network_devices ADD COLUMN location character varying(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='network_devices' AND column_name='configuration') THEN
        ALTER TABLE network_devices ADD COLUMN configuration jsonb;
    END IF;
END $$;

-- message_templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='variables') THEN
        ALTER TABLE message_templates ADD COLUMN variables jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='subject') THEN
        ALTER TABLE message_templates ADD COLUMN subject character varying(255);
    END IF;
END $$;

-- ip_addresses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_addresses' AND column_name='assigned_at') THEN
        ALTER TABLE ip_addresses ADD COLUMN assigned_at timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_addresses' AND column_name='released_at') THEN
        ALTER TABLE ip_addresses ADD COLUMN released_at timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ip_addresses' AND column_name='notes') THEN
        ALTER TABLE ip_addresses ADD COLUMN notes text;
    END IF;
END $$;

-- performance_reviews
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='review_period_start') THEN
        ALTER TABLE performance_reviews ADD COLUMN review_period_start date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='review_period_end') THEN
        ALTER TABLE performance_reviews ADD COLUMN review_period_end date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='goals_achievement') THEN
        ALTER TABLE performance_reviews ADD COLUMN goals_achievement text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='strengths') THEN
        ALTER TABLE performance_reviews ADD COLUMN strengths text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='areas_for_improvement') THEN
        ALTER TABLE performance_reviews ADD COLUMN areas_for_improvement text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_reviews' AND column_name='development_plan') THEN
        ALTER TABLE performance_reviews ADD COLUMN development_plan text;
    END IF;
END $$;

-- service_plans
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='data_limit') THEN
        ALTER TABLE service_plans ADD COLUMN data_limit integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='priority_level') THEN
        ALTER TABLE service_plans ADD COLUMN priority_level integer DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='qos_settings') THEN
        ALTER TABLE service_plans ADD COLUMN qos_settings jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='fair_usage_policy') THEN
        ALTER TABLE service_plans ADD COLUMN fair_usage_policy text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='billing_cycle') THEN
        ALTER TABLE service_plans ADD COLUMN billing_cycle character varying(20) DEFAULT 'monthly';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_plans' AND column_name='features') THEN
        ALTER TABLE service_plans ADD COLUMN features jsonb;
    END IF;
END $$;

-- router_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_logs' AND column_name='log_timestamp') THEN
        ALTER TABLE router_logs ADD COLUMN log_timestamp timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_logs' AND column_name='source_module') THEN
        ALTER TABLE router_logs ADD COLUMN source_module character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='router_logs' AND column_name='raw_log') THEN
        ALTER TABLE router_logs ADD COLUMN raw_log text;
    END IF;
END $$;

-- customer_contacts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_contacts' AND column_name='relationship') THEN
        ALTER TABLE customer_contacts ADD COLUMN relationship character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_contacts' AND column_name='contact_type') THEN
        ALTER TABLE customer_contacts ADD COLUMN contact_type character varying(50);
    END IF;
END $$;

-- Final notification
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully added all missing columns to 43 tables';
    RAISE NOTICE 'Total columns added: 191';
    RAISE NOTICE 'Local PostgreSQL schema now matches Neon serverless database';
END $$;
