-- Add columns to track router provisioning status
-- Adding router provisioning tracking columns to customer_services

DO $$ 
BEGIN
  -- Add router_provisioned column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'router_provisioned'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN router_provisioned BOOLEAN DEFAULT false;
    COMMENT ON COLUMN customer_services.router_provisioned IS 'Whether service is currently provisioned on the router';
  END IF;

  -- Add router_provisioned_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'router_provisioned_at'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN router_provisioned_at TIMESTAMP;
    COMMENT ON COLUMN customer_services.router_provisioned_at IS 'When service was last provisioned to router';
  END IF;

  -- Add router_deprovisioned_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'router_deprovisioned_at'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN router_deprovisioned_at TIMESTAMP;
    COMMENT ON COLUMN customer_services.router_deprovisioned_at IS 'When service was last deprovisioned from router';
  END IF;

  -- Add router_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'router_id'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN router_id INTEGER REFERENCES network_devices(id);
    COMMENT ON COLUMN customer_services.router_id IS 'Router where this service is provisioned';
  END IF;

  -- Add pppoe_username column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'pppoe_username'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN pppoe_username VARCHAR(255);
    COMMENT ON COLUMN customer_services.pppoe_username IS 'PPPoE username for this service';
  END IF;

  -- Add pppoe_password column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_services' AND column_name = 'pppoe_password'
  ) THEN
    ALTER TABLE customer_services ADD COLUMN pppoe_password VARCHAR(255);
    COMMENT ON COLUMN customer_services.pppoe_password IS 'PPPoE password for this service';
  END IF;

  -- Create index for faster provisioning queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_services' AND indexname = 'idx_customer_services_router_provisioned'
  ) THEN
    CREATE INDEX idx_customer_services_router_provisioned ON customer_services(router_provisioned, status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_services' AND indexname = 'idx_customer_services_router_id'
  ) THEN
    CREATE INDEX idx_customer_services_router_id ON customer_services(router_id);
  END IF;

END $$;

-- Log the migration
INSERT INTO activity_logs (user_id, action, entity_type, description, created_at)
VALUES (1, 'migration', 'database', 'Added router provisioning columns to customer_services table', NOW())
ON CONFLICT DO NOTHING;
