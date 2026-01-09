-- Comprehensive SERIAL Sequence Fix for ALL Tables
-- This script ensures all tables with SERIAL id columns have properly functioning auto-increment sequences
-- Per rules 1, 4, and 11 - no mock data, PostgreSQL only, all forms connect to database columns

DO $$
DECLARE
    table_record RECORD;
    max_id INTEGER;
    sequence_name TEXT;
BEGIN
    -- List of all tables with SERIAL id primary keys that need sequence fixes
    FOR table_record IN 
        SELECT unnest(ARRAY[
            'schema_migrations', 'locations', 'customers', 'service_plans', 'customer_services',
            'payments', 'invoices', 'network_devices', 'ip_addresses', 'employees',
            'performance_reviews', 'payroll', 'leave_requests', 'activity_logs', 'inventory_items',
            'purchase_orders', 'purchase_order_items', 'inventory_movements', 'inventory_serial_numbers',
            'supplier_invoices', 'supplier_invoice_items', 'company_profiles', 'system_config',
            'radius_users', 'radius_sessions_active', 'radius_sessions_archive', 'radius_nas',
            'system_logs', 'pending_tasks', 'admin_logs', 'service_inventory', 'inventory',
            'payroll_records', 'router_performance_history', 'capacity_predictions', 'network_forecasts',
            'capacity_alerts', 'bandwidth_patterns', 'infrastructure_investments', 'backup_settings',
            'backup_jobs', 'backup_restore_logs', 'message_templates', 'messages', 'tasks',
            'task_comments', 'task_attachments', 'task_notifications', 'task_performance_metrics',
            'task_categories', 'vehicles', 'fuel_logs', 'maintenance_logs', 'radius_logs',
            'openvpn_logs', 'mpesa_logs', 'router_logs', 'user_activity_logs', 'critical_events',
            'invoice_items', 'customer_phone_numbers', 'customer_emergency_contacts', 'customer_contacts',
            'customer_billing_configurations', 'account_balances', 'credit_notes', 'support_tickets',
            'ticket_responses', 'subnets', 'routers', 'customer_addresses', 'document_attachments',
            'payment_applications', 'service_history', 'bandwidth_usage', 'traffic_logs',
            'network_alerts', 'equipment_assignments', 'contract_documents', 'sla_violations',
            'change_logs', 'api_logs', 'authentication_logs', 'billing_cycles', 'payment_methods',
            'tax_configurations', 'discount_rules', 'promotion_codes', 'customer_notes',
            'service_requests', 'work_orders', 'installation_records', 'migration_history',
            'compliance_records', 'audit_trails', 'security_events', 'integration_logs',
            'webhook_deliveries', 'notification_queue', 'email_templates', 'sms_logs',
            'call_logs', 'chat_sessions', 'feedback_submissions', 'survey_responses',
            'training_records', 'certification_records', 'equipment_inventory', 'spare_parts',
            'warranty_records', 'vendor_contracts', 'purchase_requisitions', 'goods_received',
            'stock_adjustments', 'asset_register', 'depreciation_schedule', 'insurance_policies',
            'lease_agreements', 'utility_bills', 'maintenance_schedules', 'incident_reports',
            'risk_assessments', 'policy_documents', 'procedure_manuals', 'forms_templates',
            'report_configurations', 'dashboard_widgets', 'user_preferences', 'role_assignments',
            'permission_grants', 'session_tokens', 'oauth_clients', 'api_keys',
            'rate_limits', 'quota_allocations', 'feature_flags', 'experiment_variants',
            'ab_test_results', 'performance_metrics', 'health_checks', 'system_alerts',
            'backup_schedules', 'restore_points', 'data_migrations', 'schema_versions',
            'deployment_logs', 'release_notes', 'changelog_entries', 'version_history',
            'configuration_snapshots', 'environment_variables', 'secret_keys', 'encryption_keys',
            'certificate_store', 'public_keys', 'private_keys', 'signature_verification',
            'access_tokens', 'refresh_tokens', 'authorization_codes', 'consent_records'
        ]) AS table_name
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_record.table_name) THEN
            sequence_name := table_record.table_name || '_id_seq';
            
            BEGIN
                -- Get max id from table
                EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_record.table_name) INTO max_id;
                
                -- Drop existing sequence if it exists
                EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', sequence_name);
                
                -- Create new sequence starting from max_id + 1
                EXECUTE format('CREATE SEQUENCE %I START WITH %s', sequence_name, max_id + 1);
                
                -- Set the sequence as the default for the id column
                EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', 
                    table_record.table_name, sequence_name);
                
                -- Set the sequence owner to the id column
                EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', 
                    sequence_name, table_record.table_name);
                
                RAISE NOTICE 'Fixed sequence for table: % (max_id: %, sequence: %)', 
                    table_record.table_name, max_id, sequence_name;
                    
            EXCEPTION 
                WHEN OTHERS THEN
                    RAISE NOTICE 'Skipped table % (does not exist or has no id column): %', 
                        table_record.table_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed comprehensive sequence fix for all tables';
END $$;

-- Create performance indexes for sub-5ms queries (rule 6)
CREATE INDEX IF NOT EXISTS idx_customer_services_id ON customer_services(id);
CREATE INDEX IF NOT EXISTS idx_customer_billing_configurations_id ON customer_billing_configurations(id);
CREATE INDEX IF NOT EXISTS idx_invoices_id ON invoices(id);
CREATE INDEX IF NOT EXISTS idx_payments_id ON payments(id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_id ON invoice_items(id);
CREATE INDEX IF NOT EXISTS idx_account_balances_id ON account_balances(id);
CREATE INDEX IF NOT EXISTS idx_system_logs_id ON system_logs(id);
CREATE INDEX IF NOT EXISTS idx_customer_phone_numbers_id ON customer_phone_numbers(id);
CREATE INDEX IF NOT EXISTS idx_customer_emergency_contacts_id ON customer_emergency_contacts(id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_id ON customer_contacts(id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_id ON credit_notes(id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_id ON support_tickets(id);
CREATE INDEX IF NOT EXISTS idx_service_plans_id_active ON service_plans(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_customers_id_status ON customers(id, status);
CREATE INDEX IF NOT EXISTS idx_employees_id_status ON employees(id, status);

-- Record this migration
INSERT INTO schema_migrations (migration_name) VALUES ('1007_fix_all_table_sequences_comprehensive.sql')
ON CONFLICT (migration_name) DO NOTHING;
