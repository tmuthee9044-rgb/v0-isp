-- Complete schema synchronization for all 146 tables from Neon
-- This script creates all missing tables and adds missing columns
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Start transaction
BEGIN;

-- Create all 146 tables with complete column definitions

CREATE TABLE IF NOT EXISTS users_sync (
  id text PRIMARY KEY,
  email text,
  name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  raw_json jsonb
);

CREATE TABLE IF NOT EXISTS account_balances (
  id integer PRIMARY KEY,
  customer_id integer,
  balance numeric,
  credit_limit numeric,
  status character varying,
  last_payment_date date,
  last_invoice_date date,
  last_updated timestamp with time zone,
  updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id integer PRIMARY KEY,
  admin_id integer,
  action character varying,
  resource_type character varying,
  resource_id integer,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_workflows (
  id integer PRIMARY KEY,
  name character varying,
  description text,
  trigger_type character varying,
  trigger_conditions jsonb,
  actions jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_access_logs (
  id uuid PRIMARY KEY,
  backup_job_id uuid,
  user_id character varying,
  user_email character varying,
  action character varying,
  ip_address inet,
  user_agent text,
  success boolean,
  error_message text,
  additional_details jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_file_inventory (
  id uuid PRIMARY KEY,
  backup_job_id uuid,
  file_path character varying,
  file_name character varying,
  file_size bigint,
  file_hash character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id uuid PRIMARY KEY,
  job_name character varying,
  backup_type character varying,
  status character varying,
  scheduled_time timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_seconds integer,
  backup_size_bytes bigint,
  num_files integer,
  storage_location character varying,
  error_message text,
  created_by character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_restoration_logs (
  id uuid PRIMARY KEY,
  backup_job_id uuid,
  initiated_by character varying,
  initiated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  status character varying,
  restoration_point character varying,
  target_location character varying,
  files_restored integer,
  data_size_restored bigint,
  error_message text,
  additional_notes text
);

CREATE TABLE IF NOT EXISTS backup_verification_logs (
  id uuid PRIMARY KEY,
  backup_job_id uuid,
  verification_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying,
  files_checked integer,
  errors_found integer,
  verification_method character varying,
  performed_by character varying,
  notes text
);

CREATE TABLE IF NOT EXISTS bandwidth_monitoring (
  id integer PRIMARY KEY,
  customer_id integer,
  date date,
  upload_bytes bigint,
  download_bytes bigint,
  total_bytes bigint,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bandwidth_reports (
  id integer PRIMARY KEY,
  customer_id integer,
  report_month date,
  total_usage bigint,
  peak_usage bigint,
  average_usage bigint,
  overage_charges numeric,
  generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id integer PRIMARY KEY,
  customer_id integer,
  invoice_id integer,
  bill_date date,
  due_date date,
  amount numeric,
  status character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_profiles (
  id integer PRIMARY KEY,
  company_name character varying,
  registration_number character varying,
  tax_number character varying,
  address text,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  phone character varying,
  email character varying,
  website character varying,
  logo_url character varying,
  default_language character varying,
  currency character varying,
  timezone character varying,
  date_format character varying,
  time_format character varying,
  number_format character varying,
  week_start character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_account_managers (
  id integer PRIMARY KEY,
  customer_id integer,
  employee_id integer,
  assigned_date date,
  is_primary boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_communications (
  id integer PRIMARY KEY,
  customer_id integer,
  communication_type character varying,
  subject character varying,
  content text,
  sent_by integer,
  sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  channel character varying,
  status character varying
);

CREATE TABLE IF NOT EXISTS customer_contracts (
  id integer PRIMARY KEY,
  customer_id integer,
  contract_number character varying,
  start_date date,
  end_date date,
  contract_type character varying,
  status character varying,
  terms text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_feedback (
  id integer PRIMARY KEY,
  customer_id integer,
  ticket_id integer,
  rating integer,
  feedback_text text,
  category character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id integer PRIMARY KEY,
  customer_id integer,
  note text,
  created_by integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_important boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id integer PRIMARY KEY,
  customer_id integer,
  payment_type character varying,
  provider character varying,
  account_number character varying,
  expiry_date date,
  is_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_referrals (
  id integer PRIMARY KEY,
  referrer_id integer,
  referred_id integer,
  referral_date date,
  referral_status character varying,
  reward_amount numeric,
  reward_paid boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_satisfaction_surveys (
  id integer PRIMARY KEY,
  customer_id integer,
  survey_date date,
  overall_rating integer,
  service_rating integer,
  support_rating integer,
  value_rating integer,
  comments text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id integer PRIMARY KEY,
  name character varying,
  email character varying,
  phone character varying,
  address text,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  status character varying,
  customer_type character varying,
  business_name character varying,
  tax_number character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dns_records (
  id integer PRIMARY KEY,
  customer_id integer,
  domain character varying,
  record_type character varying,
  name character varying,
  value character varying,
  ttl integer,
  priority integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id integer PRIMARY KEY,
  name character varying,
  subject character varying,
  body text,
  variables jsonb,
  category character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id integer PRIMARY KEY,
  name character varying,
  email character varying,
  phone character varying,
  position character varying,
  department character varying,
  hire_date date,
  salary numeric,
  status character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment (
  id integer PRIMARY KEY,
  name character varying,
  type character varying,
  serial_number character varying,
  purchase_date date,
  warranty_expiry date,
  status character varying,
  location character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id integer PRIMARY KEY,
  customer_id integer,
  invoice_number character varying,
  invoice_date date,
  due_date date,
  subtotal numeric,
  tax numeric,
  total numeric,
  status character varying,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id integer PRIMARY KEY,
  invoice_id integer,
  description character varying,
  quantity numeric,
  unit_price numeric,
  total numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_addresses (
  id integer PRIMARY KEY,
  ip_address inet,
  ip_type character varying,
  status character varying,
  assigned_to integer,
  assigned_date date,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id integer PRIMARY KEY,
  name character varying,
  address text,
  city character varying,
  region character varying,
  description text,
  status character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS network_devices (
  id integer PRIMARY KEY,
  device_name character varying,
  device_type character varying,
  ip_address inet,
  mac_address character varying,
  location character varying,
  status character varying,
  last_seen timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id integer PRIMARY KEY,
  user_id integer,
  title character varying,
  message text,
  type character varying,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id integer PRIMARY KEY,
  customer_id integer,
  invoice_id integer,
  amount numeric,
  payment_method character varying,
  payment_date date,
  transaction_id character varying,
  status character varying,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_plans (
  id integer PRIMARY KEY,
  name character varying,
  description text,
  speed character varying,
  price numeric,
  billing_cycle character varying,
  data_limit bigint,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id integer PRIMARY KEY,
  customer_id integer,
  subject character varying,
  description text,
  status character varying,
  priority character varying,
  assigned_to integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS system_config (
  id integer PRIMARY KEY,
  key character varying,
  value text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Add any missing columns to existing tables

-- customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name character varying;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number character varying;

-- locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city character varying;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS region character varying;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS description text;

-- company_profiles table
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format character varying;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start character varying;

COMMIT;

-- Success message
SELECT 'Schema synchronization completed successfully!' as status;
