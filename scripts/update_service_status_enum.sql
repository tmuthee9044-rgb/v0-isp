-- Update customer service status to support new statuses
-- This migration adds: inactive, provisioned, suspended statuses

-- Drop existing constraint if it exists
ALTER TABLE customer_services DROP CONSTRAINT IF EXISTS customer_services_status_check;

-- Add new status values
DO $$ 
BEGIN
  -- Check if the enum type exists and update it
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status_enum') THEN
    -- Add new enum values if they don't exist
    BEGIN
      ALTER TYPE service_status_enum ADD VALUE IF NOT EXISTS 'inactive';
      ALTER TYPE service_status_enum ADD VALUE IF NOT EXISTS 'provisioned';
      ALTER TYPE service_status_enum ADD VALUE IF NOT EXISTS 'suspended';
      EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    -- Create the enum type
    CREATE TYPE service_status_enum AS ENUM ('inactive', 'provisioned', 'active', 'suspended', 'pending', 'terminated');
  END IF;
END $$;

-- Add provisioning tracking columns
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS router_provisioned BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS radius_provisioned BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMP;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Create index for session checking
CREATE INDEX IF NOT EXISTS idx_customer_services_online_check ON customer_services(id, is_online, last_session_at);

-- Add comment
COMMENT ON COLUMN customer_services.is_online IS 'TRUE when customer has active RADIUS session';
COMMENT ON COLUMN customer_services.router_provisioned IS 'TRUE when PPPoE secret created on physical router';
COMMENT ON COLUMN customer_services.radius_provisioned IS 'TRUE when user created in RADIUS database';
