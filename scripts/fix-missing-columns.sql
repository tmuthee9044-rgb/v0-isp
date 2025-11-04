-- Fix missing database columns that are causing errors

-- Add missing description column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing issued_date column to customer_equipment table  
ALTER TABLE customer_equipment
ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;

-- Update existing customer_equipment records to have issued_date
UPDATE customer_equipment 
SET issued_date = assigned_date 
WHERE issued_date IS NULL AND assigned_date IS NOT NULL;

-- Update existing customer_equipment records without assigned_date
UPDATE customer_equipment 
SET issued_date = created_at::date 
WHERE issued_date IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_equipment_issued_date ON customer_equipment(issued_date);
CREATE INDEX IF NOT EXISTS idx_invoices_description ON invoices(description);
