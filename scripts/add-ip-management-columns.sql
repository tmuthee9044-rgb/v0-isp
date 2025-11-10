-- Add missing columns to ip_subnets table
DO $$ 
BEGIN
  -- Add total_ips column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ip_subnets' AND column_name = 'total_ips'
  ) THEN
    ALTER TABLE ip_subnets ADD COLUMN total_ips INTEGER DEFAULT 0;
  END IF;

  -- Add used_ips column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ip_subnets' AND column_name = 'used_ips'
  ) THEN
    ALTER TABLE ip_subnets ADD COLUMN used_ips INTEGER DEFAULT 0;
  END IF;

  -- Add available_ips column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ip_subnets' AND column_name = 'available_ips'
  ) THEN
    ALTER TABLE ip_subnets ADD COLUMN available_ips INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add version column to ip_addresses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ip_addresses' AND column_name = 'version'
  ) THEN
    ALTER TABLE ip_addresses ADD COLUMN version VARCHAR(10) DEFAULT 'IPv4';
  END IF;
END $$;

-- Update existing ip_addresses to set version based on IP format
UPDATE ip_addresses 
SET version = CASE 
  WHEN ip_address LIKE '%:%' THEN 'IPv6'
  ELSE 'IPv4'
END
WHERE version IS NULL;
