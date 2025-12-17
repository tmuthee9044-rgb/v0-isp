-- Add missing columns to router_sync_status table
-- This fixes the error: column "last_sync" of relation "router_sync_status" does not exist

ALTER TABLE router_sync_status 
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_router_sync_status_last_sync ON router_sync_status(last_sync);

-- Add unique constraint on router_id to ensure only one status per router
ALTER TABLE router_sync_status 
ADD CONSTRAINT router_sync_status_router_id_unique UNIQUE (router_id);

COMMIT;
