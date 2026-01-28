-- Fix missing contact_person column in suppliers table
-- The application code uses contact_person but the table might have contact_name instead

-- Add contact_person column if it doesn't exist
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- If contact_name exists, copy its data to contact_person and keep both for compatibility
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'contact_name'
  ) THEN
    -- Copy data from contact_name to contact_person where contact_person is null
    UPDATE suppliers SET contact_person = contact_name WHERE contact_person IS NULL AND contact_name IS NOT NULL;
  END IF;
END $$;

-- Also add other potentially missing columns that the suppliers API uses
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Generate supplier_code for any existing suppliers that don't have one
UPDATE suppliers 
SET supplier_code = 'SUP-' || LPAD(id::text, 5, '0')
WHERE supplier_code IS NULL;
