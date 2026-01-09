-- Add missing columns to company_profiles table
DO $$
BEGIN
    -- Add company_prefix if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_profiles' AND column_name = 'company_prefix'
    ) THEN
        ALTER TABLE company_profiles ADD COLUMN company_prefix VARCHAR(20) DEFAULT 'ISP';
    END IF;

    -- Add tax_system if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_profiles' AND column_name = 'tax_system'
    ) THEN
        ALTER TABLE company_profiles ADD COLUMN tax_system VARCHAR(50) DEFAULT 'VAT';
    END IF;

    -- Add tax_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_profiles' AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE company_profiles ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 16.00;
    END IF;
END $$;
