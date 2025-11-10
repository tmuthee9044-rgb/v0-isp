-- Add missing throttle_speed column to service_plans table
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS throttle_speed VARCHAR(50);

-- Update existing service plans with throttle speed values
UPDATE service_plans SET throttle_speed = '2/1 Mbps' WHERE name = 'Basic Home';
UPDATE service_plans SET throttle_speed = '5/2 Mbps' WHERE name = 'Standard Home';  
UPDATE service_plans SET throttle_speed = '10/5 Mbps' WHERE name = 'Premium Home';
UPDATE service_plans SET throttle_speed = NULL WHERE category IN ('business', 'enterprise');

-- Add status column if it doesn't exist and set default values
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
UPDATE service_plans SET status = 'active' WHERE status IS NULL;
