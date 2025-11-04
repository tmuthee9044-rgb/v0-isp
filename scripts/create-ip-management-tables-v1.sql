-- IP Management Tables Setup
-- This script creates/updates tables for IP subnet and address management

-- Ensure ip_subnets table has all required columns
DO $$ 
BEGIN
  -- Add version column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_subnets' AND column_name = 'version') THEN
    ALTER TABLE ip_subnets ADD COLUMN version VARCHAR(10) DEFAULT 'IPv4';
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_subnets' AND column_name = 'status') THEN
    ALTER TABLE ip_subnets ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  
  -- Add total_ips column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_subnets' AND column_name = 'total_ips') THEN
    ALTER TABLE ip_subnets ADD COLUMN total_ips INTEGER DEFAULT 0;
  END IF;
  
  -- Add used_ips column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_subnets' AND column_name = 'used_ips') THEN
    ALTER TABLE ip_subnets ADD COLUMN used_ips INTEGER DEFAULT 0;
  END IF;
END $$;

-- Ensure ip_addresses table has all required columns
DO $$
BEGIN
  -- Add released_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_addresses' AND column_name = 'released_at') THEN
    ALTER TABLE ip_addresses ADD COLUMN released_at TIMESTAMP;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_addresses' AND column_name = 'updated_at') THEN
    ALTER TABLE ip_addresses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ip_addresses' AND column_name = 'notes') THEN
    ALTER TABLE ip_addresses ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_id ON ip_addresses(subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_subnets_router_id ON ip_subnets(router_id);
CREATE INDEX IF NOT EXISTS idx_ip_subnets_status ON ip_subnets(status);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_ip_addresses_subnet') THEN
    ALTER TABLE ip_addresses 
    ADD CONSTRAINT fk_ip_addresses_subnet 
    FOREIGN KEY (subnet_id) REFERENCES ip_subnets(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_ip_addresses_customer') THEN
    ALTER TABLE ip_addresses 
    ADD CONSTRAINT fk_ip_addresses_customer 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_ip_subnets_router') THEN
    ALTER TABLE ip_subnets 
    ADD CONSTRAINT fk_ip_subnets_router 
    FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create a function to update subnet utilization
CREATE OR REPLACE FUNCTION update_subnet_utilization()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ip_subnets
  SET used_ips = (
    SELECT COUNT(*) 
    FROM ip_addresses 
    WHERE subnet_id = COALESCE(NEW.subnet_id, OLD.subnet_id) 
    AND status = 'assigned'
  )
  WHERE id = COALESCE(NEW.subnet_id, OLD.subnet_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update subnet utilization
DROP TRIGGER IF EXISTS trigger_update_subnet_utilization ON ip_addresses;
CREATE TRIGGER trigger_update_subnet_utilization
AFTER INSERT OR UPDATE OR DELETE ON ip_addresses
FOR EACH ROW
EXECUTE FUNCTION update_subnet_utilization();
