import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    
    // Complete list of all 146 tables with their expected columns from Neon
    const expectedTables = {
      'account_balances': ['id', 'customer_id', 'balance', 'credit_limit', 'last_payment_date', 'last_invoice_date', 'status', 'last_updated', 'updated_at'],
      'admin_logs': ['id', 'admin_id', 'action', 'resource_type', 'resource_id', 'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at'],
      'automation_workflows': ['id', 'name', 'description', 'trigger_type', 'trigger_conditions', 'actions', 'is_active', 'created_at', 'updated_at'],
      'backup_access_logs': ['id', 'backup_job_id', 'user_id', 'user_email', 'action', 'success', 'error_message', 'ip_address', 'user_agent', 'additional_details', 'created_at'],
      'backup_file_inventory': ['id', 'backup_job_id', 'file_path', 'file_size', 'file_type', 'file_hash', 'is_encrypted', 'compression_ratio', 'last_modified', 'created_at'],
      'backup_jobs': ['id', 'backup_type', 'status', 'started_at', 'completed_at', 'file_size', 'backup_path', 'storage_location', 'includes_database', 'includes_files', 'includes_config', 'includes_logs', 'checksum', 'encryption_used', 'compression_ratio', 'error_message', 'description', 'local_path', 'remote_path', 'cloud_path', 'created_at', 'updated_at'],
      'backup_restore_logs': ['id', 'backup_job_id', 'restore_type', 'status', 'started_at', 'completed_at', 'restored_by', 'restore_location', 'restored_components', 'error_message', 'created_at'],
      'backup_schedules': ['id', 'name', 'backup_type', 'cron_expression', 'timezone', 'retention_policy', 'storage_locations', 'backup_components', 'is_active', 'last_run', 'next_run', 'total_runs', 'successful_runs', 'failed_runs', 'average_duration_minutes', 'created_at', 'updated_at'],
      'backup_settings': ['id', 'enable_database_backup', 'enable_file_backup', 'database_retention_days', 'file_retention_days', 'database_compression', 'enable_encryption', 'encryption_key', 'full_backup_frequency', 'full_backup_day', 'full_backup_time', 'incremental_frequency', 'incremental_interval', 'incremental_time', 'backup_paths', 'exclude_patterns', 'enable_scheduled_backups', 'backup_customers', 'backup_billing', 'backup_network', 'backup_settings', 'backup_logs', 'enable_local_storage', 'local_storage_path', 'local_storage_quota', 'local_cleanup_policy', 'enable_cloud_storage', 'cloud_provider', 'cloud_region', 'cloud_bucket', 'cloud_access_key', 'cloud_secret_key', 'enable_remote_storage', 'remote_protocol', 'remote_host', 'remote_port', 'remote_username', 'remote_password', 'remote_path', 'enable_notifications', 'enable_integrity_check', 'enable_access_logging', 'enable_secure_delete', 'maintenance_start', 'maintenance_end', 'created_at', 'updated_at'],
      'backup_storage_locations': ['id', 'name', 'storage_type', 'connection_string', 'access_credentials', 'configuration', 'total_capacity_gb', 'used_space_gb', 'available_space_gb', 'is_primary', 'is_active', 'last_tested', 'test_status', 'test_message', 'created_at', 'updated_at'],
      'balance_sheet_view': ['assets_total', 'liabilities_total', 'equity_total', 'revenue_total', 'expense_total'],
      'bandwidth_configs': ['id', 'device_id', 'download_limit', 'upload_limit', 'burst_limit', 'priority', 'qos_policy', 'created_at'],
      'bandwidth_patterns': ['id', 'pattern_date', 'hour_of_day', 'day_of_week', 'average_usage', 'peak_usage', 'created_at'],
      'bank_transactions': ['id', 'payment_id', 'bank_name', 'account_number', 'transaction_id', 'bank_reference', 'amount', 'currency', 'status', 'processor_response', 'created_at', 'updated_at'],
      'billing_cycles': ['id', 'customer_id', 'cycle_start', 'cycle_end', 'amount', 'status', 'created_at'],
      'bonus_campaigns': ['id', 'campaign_name', 'description', 'campaign_type', 'start_date', 'end_date', 'bonus_rules', 'target_audience', 'max_participants', 'current_participants', 'total_bonus_awarded', 'is_active', 'created_by', 'created_at'],
      'budget_line_items': ['id', 'version_id', 'category_id', 'subcategory_id', 'line_item_name', 'budgeted_amount', 'quarter_1', 'quarter_2', 'quarter_3', 'quarter_4', 'notes', 'created_at'],
      'budget_versions': ['id', 'version_name', 'budget_year', 'status', 'approved_by', 'approved_at', 'created_at'],
      'budgets': ['id', 'category', 'budget_period', 'budget_year', 'budgeted_amount', 'actual_amount', 'notes', 'created_at', 'updated_at'],
      'bus_fare_records': ['id', 'employee_id', 'employee_name', 'from_location', 'to_location', 'travel_date', 'amount', 'receipt_number', 'purpose', 'status', 'approved_by', 'created_at'],
      'capacity_alerts': ['id', 'alert_type', 'threshold_value', 'current_value', 'severity', 'status', 'resolved_at', 'created_at'],
      'capacity_predictions': ['id', 'prediction_date', 'predicted_capacity', 'confidence_level', 'model_version', 'created_at'],
      'card_transactions': ['id', 'payment_id', 'processor', 'transaction_id', 'card_last_four', 'amount', 'currency', 'status', 'processor_response', 'created_at', 'updated_at'],
      'cash_flow_categories': ['id', 'name', 'category_type', 'is_inflow', 'created_at'],
      'cash_flow_transactions': ['id', 'category_id', 'transaction_date', 'description', 'amount', 'bank_account', 'reference_type', 'reference_id', 'created_at'],
      'cash_transactions': ['id', 'payment_id', 'transaction_id', 'amount', 'received_by', 'notes', 'status', 'created_at', 'updated_at'],
      'chart_of_accounts': ['id', 'account_code', 'account_name', 'account_type', 'parent_account_id', 'description', 'is_active', 'created_at'],
      'communication_settings': ['id', 'setting_type', 'provider', 'sender_id', 'api_key', 'configuration', 'is_active', 'created_at', 'updated_at'],
      'company_content': ['id', 'content_type', 'content', 'created_at', 'updated_at'],
      'company_profiles': ['id', 'company_name', 'description', 'company_prefix', 'registration_number', 'tax_number', 'tax_system', 'tax_rate', 'currency', 'address', 'phone', 'email', 'website', 'logo_url', 'established_date', 'industry', 'timezone', 'date_format', 'time_format', 'number_format', 'week_start', 'default_language', 'created_at', 'updated_at'],
      'connection_methods': ['id', 'name', 'type', 'description', 'config', 'is_active', 'created_at', 'updated_at'],
      'credit_applications': ['id', 'customer_id', 'invoice_id', 'adjustment_id', 'amount_applied', 'created_at'],
      'credit_notes': ['id', 'credit_note_number', 'customer_id', 'invoice_id', 'amount', 'reason', 'notes', 'status', 'created_by', 'approved_by', 'approved_at', 'created_at', 'updated_at'],
      'customer_addresses': ['id', 'customer_id', 'address_type', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'gps_coordinates', 'is_primary', 'created_at'],
      'customer_billing_configurations': ['id', 'customer_id', 'billing_cycle', 'billing_day', 'payment_terms', 'custom_payment_terms', 'credit_limit', 'tax_rate', 'tax_exempt', 'tax_inclusive', 'late_fee_type', 'late_fee_amount', 'grace_period_days', 'overdue_threshold_days', 'auto_suspend_on_overdue', 'auto_generate_invoices', 'auto_send_invoices', 'auto_send_reminders', 'reminder_days_before', 'reminder_days_after', 'pro_rata_enabled', 'billing_notes', 'custom_invoice_template', 'notification_methods', 'notification_email', 'notification_phone', 'created_by', 'created_at', 'updated_at'],
      'customer_categories': ['id', 'name', 'description', 'discount_percentage', 'priority_level', 'created_at'],
      'customer_contacts': ['id', 'customer_id', 'contact_type', 'name', 'relationship', 'phone', 'email', 'is_primary', 'created_at'],
      'customer_document_access_logs': ['id', 'document_id', 'user_id', 'action', 'ip_address', 'user_agent', 'created_at'],
      'customer_document_shares': ['id', 'document_id', 'shared_by', 'shared_with_email', 'access_level', 'share_token', 'expires_at', 'is_active', 'created_at'],
      'customer_documents': ['id', 'customer_id', 'document_type', 'document_name', 'file_name', 'file_path', 'file_size', 'mime_type', 'description', 'tags', 'status', 'version', 'parent_document_id', 'is_confidential', 'expires_at', 'uploaded_by', 'created_at', 'updated_at'],
      'customer_emergency_contacts': ['id', 'customer_id', 'name', 'relationship', 'phone', 'email', 'created_at'],
      'customer_equipment': ['id', 'customer_id', 'inventory_item_id', 'inventory_serial_number_id', 'equipment_name', 'equipment_type', 'serial_number', 'mac_address', 'ip_address', 'monthly_cost', 'status', 'issued_date', 'assigned_date', 'returned_date', 'return_condition', 'return_reason', 'verified_serial_match', 'notes', 'created_at', 'updated_at'],
      'customer_notes': ['id', 'customer_id', 'note_type', 'subject', 'content', 'is_important', 'created_by', 'created_at'],
      'customer_notifications': ['id', 'customer_id', 'type', 'title', 'message', 'is_read', 'expires_at', 'created_at'],
      'customer_payment_accounts': ['id', 'customer_id', 'type', 'title', 'field_1', 'account_details', 'is_active', 'created_at', 'updated_at'],
      'customer_phone_numbers': ['id', 'customer_id', 'type', 'phone_number', 'is_primary', 'created_at'],
      'customer_services': ['id', 'customer_id', 'service_plan_id', 'device_id', 'config_id', 'ip_address', 'connection_type', 'monthly_fee', 'start_date', 'end_date', 'status', 'activated_at', 'created_at', 'updated_at'],
      'customer_statements': ['id', 'customer_id', 'statement_number', 'statement_date', 'period_start', 'period_end', 'opening_balance', 'closing_balance', 'transaction_count', 'status', 'sent_at', 'viewed_at', 'created_at', 'updated_at'],
      'customers': ['id', 'account_number', 'customer_type', 'first_name', 'last_name', 'business_name', 'business_type', 'phone', 'email', 'address', 'city', 'state', 'postal_code', 'country', 'billing_address', 'installation_address', 'gps_coordinates', 'id_number', 'tax_number', 'status', 'location_id', 'assigned_staff_id', 'referral_source', 'preferred_contact_method', 'service_preferences', 'portal_username', 'portal_password', 'created_at', 'updated_at'],
      'email_logs': ['id', 'customer_id', 'invoice_id', 'email_type', 'recipient_email', 'subject', 'content', 'status', 'sent_at', 'opened_at', 'clicked_at', 'bounced_at', 'error_message', 'created_at'],
      'employees': ['id', 'employee_id', 'first_name', 'last_name', 'email', 'phone', 'position', 'department', 'hire_date', 'salary', 'status', 'created_at'],
      'equipment_returns': ['id', 'customer_id', 'customer_equipment_id', 'inventory_item_id', 'inventory_serial_number_id', 'serial_number', 'supplier_id', 'issued_date', 'return_date', 'days_in_use', 'return_condition', 'return_reason', 'notes', 'processed_by', 'verified_serial_match', 'created_at'],
      'expense_approvals': ['id', 'expense_id', 'approver_id', 'status', 'comments', 'created_at'],
      'expense_categories': ['id', 'name', 'description', 'color', 'budget_amount', 'is_active', 'created_at', 'updated_at'],
      'expense_subcategories': ['id', 'category_id', 'name', 'description', 'budget_allocation', 'created_at'],
      'expenses': ['id', 'category_id', 'expense_date', 'description', 'amount', 'tax_amount', 'payment_method', 'vendor', 'receipt_url', 'notes', 'status', 'approved_by', 'approved_at', 'is_recurring', 'recurring_frequency', 'project_id', 'created_at', 'updated_at'],
      'finance_audit_trail': ['id', 'table_name', 'record_id', 'action', 'old_values', 'new_values', 'user_id', 'ip_address', 'user_agent', 'created_at'],
      'finance_documents': ['id', 'type', 'reference_number', 'invoice_number', 'invoice_date', 'due_date', 'payment_date', 'customer_id', 'amount', 'total_amount', 'status', 'description', 'notes', 'metadata', 'created_by', 'created_at', 'updated_at'],
      'financial_adjustments': ['id', 'customer_id', 'invoice_id', 'adjustment_type', 'amount', 'reason', 'reference_number', 'status', 'created_by', 'approved_by', 'approved_at', 'metadata', 'created_at'],
      'financial_periods': ['id', 'period_type', 'period_name', 'start_date', 'end_date', 'is_closed', 'created_at'],
      'financial_reports': ['id', 'report_type', 'report_period', 'period_start', 'period_end', 'report_data', 'generated_by', 'created_at'],
      'fuel_logs': ['id', 'vehicle_id', 'log_date', 'odometer_reading', 'quantity', 'cost', 'fuel_type', 'location', 'notes', 'created_at'],
      'hotspot_sessions': ['id', 'hotspot_id', 'user_id', 'mac_address', 'ip_address', 'start_time', 'end_time', 'data_used', 'status', 'created_at'],
      'hotspot_users': ['id', 'hotspot_id', 'username', 'password', 'email', 'phone', 'status', 'expiry_date', 'data_limit', 'time_limit', 'created_at', 'updated_at'],
      'hotspot_vouchers': ['id', 'hotspot_id', 'code', 'expiry_date', 'data_limit', 'time_limit', 'max_users', 'used_count', 'status', 'created_at'],
      'hotspots': ['id', 'name', 'location', 'address', 'latitude', 'longitude', 'ssid', 'password', 'security_type', 'bandwidth_limit', 'user_limit', 'device_mac', 'device_model', 'ip_address', 'status', 'created_at', 'updated_at'],
      'infrastructure_investments': ['id', 'investment_type', 'description', 'amount', 'investment_date', 'expected_roi', 'status', 'created_at'],
      'inventory': ['id', 'name', 'sku', 'category', 'description', 'stock_quantity', 'unit_cost', 'supplier', 'status', 'created_at', 'updated_at'],
      'inventory_items': ['id', 'name', 'sku', 'category', 'description', 'specifications', 'stock_quantity', 'unit_cost', 'supplier_id', 'location', 'status', 'created_at', 'updated_at'],
      'inventory_serial_numbers': ['id', 'inventory_item_id', 'serial_number', 'status', 'purchase_order_id', 'supplier_id', 'customer_equipment_id', 'received_date', 'assigned_date', 'returned_date', 'return_condition', 'notes', 'created_at', 'updated_at'],
      'invoice_items': ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'total_price', 'created_at', 'updated_at'],
      'invoices': ['id', 'customer_id', 'invoice_number', 'amount', 'paid_amount', 'due_date', 'status', 'description', 'created_at'],
      'ip_addresses': ['id', 'subnet_id', 'ip_address', 'status', 'customer_id', 'assigned_at', 'released_at', 'notes', 'created_at', 'updated_at'],
      'ip_pools': ['id', 'router_id', 'ip_address', 'subnet_mask', 'gateway', 'status', 'customer_id', 'allocated_at', 'created_at'],
      'ip_subnets': ['id', 'name', 'cidr', 'type', 'version', 'status', 'allocation_mode', 'router_id', 'total_ips', 'used_ips', 'description', 'created_at', 'updated_at'],
      'journal_entries': ['id', 'entry_number', 'entry_date', 'description', 'reference_type', 'reference_id', 'total_debit', 'total_credit', 'status', 'created_by', 'created_at'],
      'journal_entry_lines': ['id', 'journal_entry_id', 'line_number', 'account_id', 'description', 'debit_amount', 'credit_amount', 'created_at'],
      'knowledge_base': ['id', 'category', 'title', 'content', 'tags', 'author_id', 'views', 'is_published', 'created_at', 'updated_at'],
      'locations': ['id', 'name', 'address', 'city', 'region', 'description', 'status', 'created_at', 'updated_at'],
      'loyalty_redemptions': ['id', 'customer_id', 'points_redeemed', 'redemption_type', 'redemption_value', 'description', 'applied_to_invoice', 'applied_to_service', 'wallet_credit_amount', 'status', 'processed_by', 'processed_at', 'created_at'],
      'loyalty_transactions': ['id', 'customer_id', 'transaction_type', 'points', 'description', 'source_type', 'source_id', 'expires_at', 'metadata', 'created_by', 'created_at'],
      'maintenance_logs': ['id', 'vehicle_id', 'service_date', 'service_type', 'description', 'cost', 'odometer_reading', 'parts_replaced', 'service_provider', 'next_service_date', 'created_at'],
      'message_campaigns': ['id', 'name', 'description', 'template_id', 'target_audience', 'total_recipients', 'sent_count', 'delivered_count', 'failed_count', 'status', 'scheduled_at', 'created_by', 'created_at'],
      'message_templates': ['id', 'name', 'template_type', 'subject', 'content', 'variables', 'is_active', 'created_at', 'updated_at'],
      'messages': ['id', 'message_type', 'sender_id', 'recipient_type', 'recipient_id', 'subject', 'content', 'template_id', 'status', 'scheduled_at', 'sent_at', 'delivered_at', 'metadata', 'created_at'],
      'mpesa_logs': ['id', 'transaction_type', 'transaction_id', 'merchant_request_id', 'checkout_request_id', 'result_code', 'result_desc', 'amount', 'phone_number', 'customer_id', 'invoice_id', 'raw_response', 'processed_at', 'created_at'],
      'network_configurations': ['id', 'device_id', 'ip_address', 'gateway', 'dns1', 'dns2', 'pppoe_enabled', 'pppoe_username', 'pppoe_password', 'bandwidth_config', 'status', 'deployed_at', 'created_at'],
      'network_devices': ['id', 'name', 'type', 'location', 'location_id', 'ip_address', 'mac_address', 'status', 'last_seen', 'configuration', 'created_at', 'updated_at'],
      'network_forecasts': ['id', 'forecast_period', 'predicted_users', 'predicted_bandwidth', 'growth_rate', 'created_at'],
      'notification_logs': ['id', 'customer_id', 'invoice_id', 'notification_type', 'channel', 'recipient_email', 'recipient_phone', 'status', 'error_message', 'created_at', 'updated_at'],
      'notification_templates': ['id', 'template_name', 'template_type', 'subject', 'content', 'variables', 'is_active', 'created_at', 'updated_at'],
      'openvpn_configs': ['id', 'customer_id', 'router_id', 'config_content', 'status', 'expires_at', 'revoked_at', 'created_at'],
      'openvpn_logs': ['id', 'username', 'action', 'client_ip', 'server_ip', 'bytes_sent', 'bytes_received', 'session_duration', 'log_timestamp', 'created_at'],
      'payment_applications': ['id', 'payment_id', 'invoice_id', 'amount_applied', 'created_at', 'updated_at'],
      'payment_gateway_configs': ['id', 'gateway_name', 'api_key', 'secret_key', 'webhook_url', 'is_sandbox', 'is_active', 'configuration', 'created_at', 'updated_at'],
      'payment_methods': ['id', 'name', 'type', 'configuration', 'is_active', 'created_at'],
      'payment_reminders': ['id', 'customer_id', 'amount', 'due_date', 'reminder_type', 'status', 'sent_at'],
      'payments': ['id', 'customer_id', 'amount', 'payment_method', 'transaction_id', 'payment_date', 'status', 'currency', 'created_at'],
      'payroll_records': ['id', 'employee_id', 'pay_period_start', 'pay_period_end', 'basic_salary', 'allowances', 'overtime_hours', 'overtime_rate', 'gross_pay', 'tax_deduction', 'deductions', 'net_pay', 'payment_date', 'status', 'created_at'],
      'performance_reviews': ['id', 'employee_id', 'reviewer_id', 'review_period_start', 'review_period_end', 'overall_rating', 'goals_achievement', 'strengths', 'areas_for_improvement', 'development_plan', 'status', 'created_at'],
      'permissions': ['id', 'module', 'permission_name', 'permission_key', 'description', 'created_at'],
      'portal_sessions': ['id', 'customer_id', 'session_token', 'ip_address', 'user_agent', 'last_activity', 'expires_at', 'created_at'],
      'portal_settings': ['id', 'setting_key', 'setting_value', 'setting_type', 'description', 'is_public', 'created_at', 'updated_at'],
      'purchase_order_items': ['id', 'purchase_order_id', 'inventory_item_id', 'quantity', 'unit_cost', 'total_cost', 'created_at'],
      'purchase_orders': ['id', 'order_number', 'supplier_id', 'total_amount', 'status', 'notes', 'created_by', 'created_at', 'updated_at'],
      'radius_logs': ['id', 'username', 'nas_ip', 'nas_port', 'calling_station_id', 'called_station_id', 'service_type', 'framed_ip', 'acct_status_type', 'acct_session_id', 'acct_session_time', 'acct_input_octets', 'acct_output_octets', 'acct_terminate_cause', 'log_timestamp', 'created_at'],
      'refunds': ['id', 'customer_id', 'adjustment_id', 'amount', 'refund_method', 'transaction_reference', 'status', 'processed_at', 'created_at', 'updated_at'],
      'revenue_categories': ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
      'revenue_streams': ['id', 'category_id', 'name', 'description', 'is_recurring', 'created_at'],
      'role_permissions': ['id', 'role_id', 'permission_id', 'created_at'],
      'roles': ['id', 'name', 'description', 'is_system_role', 'created_at', 'updated_at'],
      'router_logs': ['id', 'router_id', 'log_level', 'event_type', 'source_module', 'message', 'raw_log', 'log_timestamp', 'created_at'],
      'router_performance_history': ['id', 'router_id', 'timestamp', 'cpu_usage', 'memory_usage', 'uptime', 'temperature', 'bandwidth_in', 'bandwidth_out', 'latency', 'packet_loss', 'created_at'],
      'router_services': ['id', 'router_id', 'service_type', 'is_enabled', 'configuration', 'created_at', 'updated_at'],
      'router_sync_status': ['id', 'router_id', 'customer_service_id', 'ip_address_id', 'sync_status', 'sync_message', 'last_synced', 'last_checked', 'retry_count', 'created_at', 'updated_at'],
      'routers': ['id', 'name', 'type', 'model', 'serial_number', 'firmware_version', 'hostname', 'ip_address', 'username', 'password', 'api_port', 'ssh_port', 'connection_type', 'location_id', 'status', 'last_seen', 'last_sync', 'sync_status', 'sync_error', 'cpu_usage', 'memory_usage', 'uptime', 'temperature', 'configuration', 'created_at', 'updated_at'],
      'server_configurations': ['id', 'server_name', 'server_type', 'ip_address', 'port', 'configuration', 'status', 'last_updated', 'created_at'],
      'service_activation_logs': ['id', 'service_id', 'customer_id', 'action', 'status', 'error_message', 'details', 'created_at'],
      'service_inventory': ['id', 'service_id', 'inventory_id', 'status', 'assigned_at', 'returned_at', 'notes'],
      'service_plans': ['id', 'name', 'description', 'price', 'currency', 'billing_cycle', 'download_speed', 'upload_speed', 'data_limit', 'features', 'qos_settings', 'priority_level', 'fair_usage_policy', 'status', 'created_at'],
      'service_requests': ['id', 'customer_id', 'request_type', 'current_service_id', 'requested_service_plan_id', 'description', 'notes', 'status', 'requested_at', 'processed_by', 'processed_at'],
      'sms_logs': ['id', 'customer_id', 'invoice_id', 'sms_type', 'recipient_phone', 'message', 'message_id', 'provider', 'status', 'cost', 'sent_at', 'delivered_at', 'failed_at', 'error_message', 'created_at'],
      'subnets': ['id', 'router_id', 'name', 'network', 'gateway', 'dns_servers', 'description', 'status', 'created_at'],
      'supplier_invoice_items': ['id', 'invoice_id', 'inventory_item_id', 'description', 'quantity', 'unit_cost', 'total_amount', 'created_at'],
      'supplier_invoices': ['id', 'supplier_id', 'purchase_order_id', 'invoice_number', 'invoice_date', 'due_date', 'payment_terms', 'subtotal', 'tax_amount', 'total_amount', 'paid_amount', 'status', 'notes', 'created_by', 'created_at', 'updated_at'],
      'suppliers': ['id', 'name', 'company_name', 'contact_name', 'email', 'phone', 'address', 'website', 'tax_id', 'payment_terms', 'is_active', 'created_at', 'updated_at'],
      'support_tickets': ['id', 'ticket_number', 'customer_id', 'title', 'subject', 'description', 'priority', 'status', 'assigned_to', 'resolved_at', 'created_at', 'updated_at'],
      'sync_jobs': ['id', 'router_id', 'job_type', 'status', 'progress', 'started_at', 'completed_at', 'error_message', 'details', 'created_at'],
      'system_config': ['id', 'key', 'value', 'created_at'],
      'system_logs': ['id', 'level', 'category', 'source', 'message', 'details', 'user_id', 'customer_id', 'session_id', 'ip_address', 'user_agent', 'timestamp', 'created_at', 'updated_at'],
      'task_attachments': ['id', 'task_id', 'filename', 'file_path', 'file_size', 'mime_type', 'uploaded_by', 'created_at'],
      'task_categories': ['id', 'name', 'description', 'color', 'created_at'],
      'task_comments': ['id', 'task_id', 'user_id', 'comment', 'created_at'],
      'tasks': ['id', 'title', 'description', 'priority', 'status', 'due_date', 'assigned_to', 'created_by', 'completed_at', 'created_at', 'updated_at'],
      'tax_configurations': ['id', 'tax_name', 'tax_type', 'tax_rate', 'applies_to', 'is_active', 'created_at', 'updated_at'],
      'tax_periods': ['id', 'period_name', 'start_date', 'end_date', 'status', 'created_at'],
      'tax_returns': ['id', 'period_id', 'return_type', 'tax_authority', 'total_revenue', 'total_expenses', 'taxable_income', 'tax_due', 'penalty_amount', 'due_date', 'filed_date', 'reference_number', 'status', 'notes', 'created_at'],
      'trial_balance_view': ['account_id', 'account_code', 'account_name', 'account_type', 'debit_total', 'credit_total', 'balance'],
      'user_activity_logs': ['id', 'user_id', 'user_type', 'activity', 'description', 'ip_address', 'user_agent', 'session_id', 'created_at'],
      'users': ['id', 'username', 'email', 'password_hash', 'role', 'status', 'created_at'],
      'vehicles': ['id', 'name', 'type', 'registration', 'model', 'year', 'fuel_type', 'fuel_consumption', 'mileage', 'status', 'location', 'assigned_to', 'purchase_date', 'purchase_cost', 'last_service', 'next_service', 'insurance_expiry', 'license_expiry', 'created_at', 'updated_at'],
      'wallet_balances': ['id', 'customer_id', 'current_balance', 'total_topups', 'total_bonuses', 'total_spent', 'last_topup_date', 'last_transaction_date', 'created_at', 'updated_at'],
      'wallet_bonus_rules': ['id', 'rule_name', 'description', 'topup_min_amount', 'bonus_fixed_amount', 'bonus_percentage', 'max_bonus_amount', 'points_per_amount', 'points_awarded', 'valid_from', 'valid_until', 'target_customer_type', 'max_uses_per_customer', 'is_active', 'created_by', 'created_at', 'updated_at'],
      'wallet_transactions': ['id', 'customer_id', 'transaction_type', 'amount', 'balance_before', 'balance_after', 'description', 'source_type', 'source_id', 'reference_number', 'metadata', 'processed_by', 'created_at'],
      'warehouses': ['id', 'code', 'name', 'location', 'contact_person', 'phone', 'email', 'created_at', 'updated_at'],
    }
    
    const results: any[] = []
    let totalTables = 0
    let tablesWithIssues = 0
    let missingTables = 0
    let columnMismatches = 0
    
    // Process in batches of 10
    const tableNames = Object.keys(expectedTables)
    const batchSize = 10
    
    for (let i = 0; i < tableNames.length; i += batchSize) {
      const batch = tableNames.slice(i, i + batchSize)
      console.log(`[v0] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tableNames.length/batchSize)}:`, batch.join(', '))
      
      for (const tableName of batch) {
        totalTables++
        const expectedColumns = (expectedTables as any)[tableName]
        
        try {
          // Check if table exists
          const tableCheck = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${tableName}
            )
          `
          
          if (!tableCheck[0].exists) {
            missingTables++
            tablesWithIssues++
            results.push({
              table: tableName,
              status: 'MISSING',
              message: 'Table does not exist in local database',
              expectedColumns: expectedColumns.length,
              actualColumns: 0,
              missingColumns: expectedColumns
            })
            continue
          }
          
          // Get actual columns
          const columns = await sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
            ORDER BY ordinal_position
          `
          
          const actualColumns = columns.map((c: any) => c.column_name)
          const missingCols = expectedColumns.filter((col: string) => !actualColumns.includes(col))
          const extraCols = actualColumns.filter((col: string) => !expectedColumns.includes(col))
          
          if (missingCols.length > 0 || extraCols.length > 0) {
            columnMismatches++
            tablesWithIssues++
            results.push({
              table: tableName,
              status: 'MISMATCH',
              message: `Column mismatch detected`,
              expectedColumns: expectedColumns.length,
              actualColumns: actualColumns.length,
              missingColumns: missingCols,
              extraColumns: extraCols
            })
          } else {
            results.push({
              table: tableName,
              status: 'OK',
              message: 'All columns match',
              expectedColumns: expectedColumns.length,
              actualColumns: actualColumns.length
            })
          }
          
        } catch (error: any) {
          tablesWithIssues++
          results.push({
            table: tableName,
            status: 'ERROR',
            message: error.message,
            expectedColumns: expectedColumns.length,
            actualColumns: 0
          })
        }
      }
    }
    
    return NextResponse.json({
      summary: {
        totalTables,
        tablesWithIssues,
        missingTables,
        columnMismatches,
        successRate: ((totalTables - tablesWithIssues) / totalTables * 100).toFixed(2) + '%'
      },
      results: results.filter(r => r.status !== 'OK'), // Only show tables with issues
      allResults: results // Include all for download
    })
    
  } catch (error: any) {
    console.error('[v0] Schema validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate schemas', details: error.message },
      { status: 500 }
    )
  }
}
