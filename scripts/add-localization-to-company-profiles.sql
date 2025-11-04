-- Add localization settings columns to company_profiles table

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h',
ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'comma',
ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'Monday',
ADD COLUMN IF NOT EXISTS company_prefix VARCHAR(10) DEFAULT 'ISP',
ADD COLUMN IF NOT EXISTS tax_system VARCHAR(50) DEFAULT 'VAT',
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 16.00;

-- Insert default company profile if none exists
INSERT INTO company_profiles (
  company_name,
  email,
  phone,
  default_language,
  currency,
  timezone,
  date_format,
  time_format,
  number_format,
  week_start,
  company_prefix,
  tax_system,
  tax_rate,
  created_at,
  updated_at
)
SELECT
  'Your Company Name',
  'info@company.com',
  '+254700000000',
  'en',
  'KES',
  'Africa/Nairobi',
  'DD/MM/YYYY',
  '24h',
  'comma',
  'Monday',
  'ISP',
  'VAT',
  16.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM company_profiles LIMIT 1);

COMMENT ON COLUMN company_profiles.default_language IS 'Default language for the system (en, sw, fr)';
COMMENT ON COLUMN company_profiles.currency IS 'Default currency (KES, UGX, TZS, USD)';
COMMENT ON COLUMN company_profiles.timezone IS 'Default timezone (Africa/Nairobi, Africa/Kampala, etc.)';
COMMENT ON COLUMN company_profiles.date_format IS 'Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)';
COMMENT ON COLUMN company_profiles.time_format IS 'Time format (24h, 12h)';
COMMENT ON COLUMN company_profiles.number_format IS 'Number format separator (comma, space, period)';
COMMENT ON COLUMN company_profiles.week_start IS 'First day of week (Sunday, Monday)';
COMMENT ON COLUMN company_profiles.company_prefix IS 'Prefix for invoice/document numbers';
COMMENT ON COLUMN company_profiles.tax_system IS 'Tax system type (VAT, Sales Tax, GST)';
COMMENT ON COLUMN company_profiles.tax_rate IS 'Default tax rate percentage';
