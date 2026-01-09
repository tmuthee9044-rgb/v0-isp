-- Add unique constraint on router_id in router_sync_status table
-- This allows the ON CONFLICT clause to work properly

-- First, remove any duplicate router_id entries (keep the most recent)
DELETE FROM router_sync_status
WHERE id NOT IN (
  SELECT MAX(id)
  FROM router_sync_status
  GROUP BY router_id
);

-- Add unique constraint on router_id
ALTER TABLE router_sync_status
ADD CONSTRAINT router_sync_status_router_id_key UNIQUE (router_id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_router_sync_status_last_synced 
ON router_sync_status(last_synced DESC);
