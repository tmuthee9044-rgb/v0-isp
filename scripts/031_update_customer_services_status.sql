-- Update customer_services table to use proper ENUM for status
-- Drop existing status column if it exists and recreate with proper ENUM
DO $$ 
BEGIN
    -- Create ENUM type for service status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status_enum') THEN
        CREATE TYPE service_status_enum AS ENUM ('active', 'suspended', 'inactive', 'terminated', 'pending');
    END IF;
    
    -- Add new status column with ENUM type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_services' AND column_name = 'status_new') THEN
        ALTER TABLE customer_services ADD COLUMN status_new service_status_enum DEFAULT 'active';
        
        -- Migrate existing data
        UPDATE customer_services SET status_new = 
            CASE 
                WHEN status = 'active' THEN 'active'::service_status_enum
                WHEN status = 'suspended' THEN 'suspended'::service_status_enum
                WHEN status = 'inactive' THEN 'inactive'::service_status_enum
                WHEN status = 'terminated' THEN 'terminated'::service_status_enum
                ELSE 'pending'::service_status_enum
            END;
        
        -- Drop old column and rename new one
        ALTER TABLE customer_services DROP COLUMN IF EXISTS status;
        ALTER TABLE customer_services RENAME COLUMN status_new TO status;
    END IF;
END $$;

-- Add additional suspension tracking columns if they don't exist
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reactivated_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS suspension_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto_billing', 'admin'
ADD COLUMN IF NOT EXISTS last_router_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS router_sync_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'synced', 'failed'

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_customer_services_suspension_type ON customer_services(suspension_type);
CREATE INDEX IF NOT EXISTS idx_customer_services_router_sync ON customer_services(router_sync_status);

-- Add comments
COMMENT ON COLUMN customer_services.reactivated_at IS 'Timestamp when service was reactivated';
COMMENT ON COLUMN customer_services.reactivated_by IS 'User who reactivated the service';
COMMENT ON COLUMN customer_services.suspension_type IS 'Type of suspension: manual, auto_billing, admin';
COMMENT ON COLUMN customer_services.last_router_sync IS 'Last successful router synchronization';
COMMENT ON COLUMN customer_services.router_sync_status IS 'Router synchronization status';
