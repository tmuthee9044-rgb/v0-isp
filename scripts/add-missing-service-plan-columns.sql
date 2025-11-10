-- Add missing columns to service_plans table for backward compatibility

-- Add installation_fee column
ALTER TABLE service_plans 
ADD COLUMN IF NOT EXISTS installation_fee NUMERIC(10,2) DEFAULT 0.00;

-- Add other commonly referenced columns that might be missing
ALTER TABLE service_plans 
ADD COLUMN IF NOT EXISTS equipment_fee NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS early_termination_fee NUMERIC(10,2) DEFAULT 0.00;

-- Update existing records with default values
UPDATE service_plans 
SET 
    installation_fee = COALESCE(setup_fee, 0.00),
    equipment_fee = 0.00,
    early_termination_fee = 0.00
WHERE installation_fee IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_plans_installation_fee ON service_plans(installation_fee);
CREATE INDEX IF NOT EXISTS idx_service_plans_equipment_fee ON service_plans(equipment_fee);

-- Add comments
COMMENT ON COLUMN service_plans.installation_fee IS 'One-time installation fee charged to customer';
COMMENT ON COLUMN service_plans.equipment_fee IS 'Equipment rental or purchase fee';
COMMENT ON COLUMN service_plans.early_termination_fee IS 'Fee charged for early contract termination';

-- Success message
SELECT 'Service plans columns added successfully!' as status;
