-- Add allocation_mode column to subnets table
-- This column tracks whether IP allocation is dynamic (DHCP) or static (manual)

ALTER TABLE subnets 
ADD COLUMN IF NOT EXISTS allocation_mode VARCHAR(20) DEFAULT 'dynamic';

-- Add a check constraint to ensure valid values
ALTER TABLE subnets
ADD CONSTRAINT subnets_allocation_mode_check 
CHECK (allocation_mode IN ('dynamic', 'static', 'mixed'));

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_subnets_allocation_mode 
ON subnets(allocation_mode);

-- Update existing records to have a default value
UPDATE subnets 
SET allocation_mode = 'dynamic' 
WHERE allocation_mode IS NULL;

-- Log the change
INSERT INTO system_logs (
  level,
  category,
  message,
  details,
  created_at
) VALUES (
  'info',
  'database',
  'Added allocation_mode column to subnets table',
  '{"table": "subnets", "column": "allocation_mode", "type": "VARCHAR(20)", "default": "dynamic"}'::jsonb,
  NOW()
);
