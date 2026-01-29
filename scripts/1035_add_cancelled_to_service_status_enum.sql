-- Add 'cancelled' value to service_status_enum if it doesn't exist
-- This allows using 'cancelled' status in customer_services table

DO $$
BEGIN
  -- Check if the enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status_enum') THEN
    -- Add 'cancelled' value if it doesn't exist
    BEGIN
      ALTER TYPE service_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, ignore
      NULL;
    END;
  ELSE
    -- Create the enum with all values including 'cancelled'
    CREATE TYPE service_status_enum AS ENUM (
      'active', 
      'suspended', 
      'inactive', 
      'terminated', 
      'pending', 
      'provisioned',
      'cancelled'
    );
  END IF;
END $$;

-- Verify the enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'service_status_enum'::regtype
ORDER BY enumsortorder;
