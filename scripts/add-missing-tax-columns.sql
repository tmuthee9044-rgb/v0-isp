-- Add missing columns to tax_returns table
ALTER TABLE tax_returns 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_authority VARCHAR(255),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_returns_due_date ON tax_returns(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_returns_reference_number ON tax_returns(reference_number);
CREATE INDEX IF NOT EXISTS idx_tax_returns_tax_authority ON tax_returns(tax_authority);

-- Update existing records to have reasonable defaults
UPDATE tax_returns 
SET 
    due_date = CASE 
        WHEN filed_date IS NOT NULL THEN filed_date + INTERVAL '30 days'
        ELSE CURRENT_DATE + INTERVAL '30 days'
    END,
    tax_authority = 'KRA',
    reference_number = 'TR-' || LPAD(id::text, 6, '0')
WHERE due_date IS NULL;
