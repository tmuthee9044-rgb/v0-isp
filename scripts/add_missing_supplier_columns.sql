-- Add missing columns to suppliers table that the API route expects
-- The original create-suppliers-table.sql didn't include these columns,
-- but create-supplier-procurement-schema.sql expected them (skipped due to IF NOT EXISTS)

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- Add unique constraint on supplier_code if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_supplier_code_key'
  ) THEN
    -- Backfill supplier_code for existing rows that have null supplier_code
    UPDATE suppliers SET supplier_code = 'SUP-' || LPAD(id::text, 6, '0') WHERE supplier_code IS NULL;
    -- Now add unique constraint
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add unique constraint on supplier_code: %', SQLERRM;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_type ON suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);

SELECT 'Supplier columns migration complete' as status;
