-- Add user management settings columns to system_config table
-- This ensures all settings from /settings/users page are properly stored per rule 11

-- Ensure system_config table has proper structure
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user management settings with proper columns
INSERT INTO system_config (key, value, category, description) VALUES
  -- Password Policy Settings
  ('password_min_length', '8', 'password_policy', 'Minimum password length requirement'),
  ('password_expiry_days', '90', 'password_policy', 'Number of days before password expires'),
  ('password_require_uppercase', 'true', 'password_policy', 'Require uppercase letters in passwords'),
  ('password_require_numbers', 'true', 'password_policy', 'Require numbers in passwords'),
  ('password_require_special_chars', 'false', 'password_policy', 'Require special characters in passwords'),
  ('password_prevent_reuse', 'true', 'password_policy', 'Prevent password reuse'),
  
  -- Session Management Settings
  ('session_timeout_minutes', '60', 'session_management', 'Session timeout in minutes'),
  ('max_login_attempts', '5', 'session_management', 'Maximum failed login attempts before lockout'),
  ('lockout_duration_minutes', '30', 'session_management', 'Account lockout duration in minutes'),
  ('max_concurrent_sessions', '3', 'session_management', 'Maximum concurrent sessions per user'),
  ('force_password_change', 'true', 'session_management', 'Force password change on first login'),
  ('remember_login_sessions', 'true', 'session_management', 'Remember login sessions'),
  
  -- Two Factor Authentication Settings
  ('2fa_admin_enabled', 'true', '2fa', 'Require 2FA for administrators'),
  ('2fa_optional_enabled', 'true', '2fa', 'Allow optional 2FA for users'),
  ('2fa_method_sms', 'true', '2fa', 'Enable SMS 2FA method'),
  ('2fa_method_email', 'true', '2fa', 'Enable email 2FA method'),
  ('2fa_method_authenticator', 'false', '2fa', 'Enable authenticator app 2FA method'),
  
  -- Employee Integration Settings
  ('employee_auto_create_accounts', 'true', 'employee_integration', 'Auto-create user accounts for new employees'),
  ('employee_auto_disable_terminated', 'true', 'employee_integration', 'Auto-disable accounts for terminated employees'),
  ('employee_sync_department_changes', 'true', 'employee_integration', 'Sync department changes from employee records'),
  ('employee_sync_contact_info', 'true', 'employee_integration', 'Sync contact information from employee records'),
  ('employee_username_format', 'firstname.lastname', 'employee_integration', 'Username format for auto-created accounts'),
  ('employee_email_domain', '@techconnect.co.ke', 'employee_integration', 'Default email domain for employees'),
  ('employee_default_password_policy', 'temporary', 'employee_integration', 'Default password policy for new accounts'),
  ('employee_account_notification_method', 'email', 'employee_integration', 'Method to notify new users about their accounts')
ON CONFLICT (key) DO NOTHING;

-- Add indexes for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Add role_id column to users table if not exists (for proper role foreign key)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- Log the schema update per rule 3
INSERT INTO admin_logs (action, entity_type, details, created_at)
VALUES ('schema_update', 'system_config', 'Added user management settings columns per rule 11', NOW())
ON CONFLICT DO NOTHING;
