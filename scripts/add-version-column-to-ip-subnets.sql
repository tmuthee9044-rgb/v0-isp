-- Add version column to ip_subnets table
DO $$ 
BEGIN
  -- Check if version column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'ip_subnets' 
    AND column_name = 'version'
  ) THEN
    -- Add version column with default value
    ALTER TABLE ip_subnets 
    ADD COLUMN version VARCHAR(10) DEFAULT 'IPv4';
    
    RAISE NOTICE 'Added version column to ip_subnets table';
  ELSE
    RAISE NOTICE 'Version column already exists in ip_subnets table';
  END IF;
END $$;
