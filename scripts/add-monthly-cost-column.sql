-- Add monthly_cost column to customer_equipment table
ALTER TABLE customer_equipment 
ADD COLUMN monthly_cost NUMERIC(10,2) DEFAULT 0.00;

-- Add comment to document the column
COMMENT ON COLUMN customer_equipment.monthly_cost IS 'Monthly cost associated with this equipment assignment';

-- Update existing records to have a default monthly cost of 0
UPDATE customer_equipment 
SET monthly_cost = 0.00 
WHERE monthly_cost IS NULL;
