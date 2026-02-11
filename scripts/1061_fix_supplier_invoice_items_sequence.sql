-- Fix the supplier_invoice_items id sequence
-- The SERIAL column's default nextval() may have been dropped or broken

DO $$
DECLARE
  max_id INTEGER;
BEGIN
  -- Get current max id
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM supplier_invoice_items;
  
  -- Drop and recreate the sequence
  DROP SEQUENCE IF EXISTS supplier_invoice_items_id_seq CASCADE;
  EXECUTE format('CREATE SEQUENCE supplier_invoice_items_id_seq START WITH %s', max_id + 1);
  
  -- Re-attach the default to the id column
  ALTER TABLE supplier_invoice_items 
    ALTER COLUMN id SET DEFAULT nextval('supplier_invoice_items_id_seq');
  
  -- Set the sequence owner
  ALTER SEQUENCE supplier_invoice_items_id_seq OWNED BY supplier_invoice_items.id;
  
  RAISE NOTICE 'Fixed supplier_invoice_items_id_seq, starting at %', max_id + 1;
END $$;

-- Also fix supplier_invoices sequence while we're at it
DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM supplier_invoices;
  
  DROP SEQUENCE IF EXISTS supplier_invoices_id_seq CASCADE;
  EXECUTE format('CREATE SEQUENCE supplier_invoices_id_seq START WITH %s', max_id + 1);
  
  ALTER TABLE supplier_invoices 
    ALTER COLUMN id SET DEFAULT nextval('supplier_invoices_id_seq');
  
  ALTER SEQUENCE supplier_invoices_id_seq OWNED BY supplier_invoices.id;
  
  RAISE NOTICE 'Fixed supplier_invoices_id_seq, starting at %', max_id + 1;
END $$;

-- Add missing columns to supplier_invoice_items that some routes expect
-- Some routes use item_name/unit_price/total_price instead of description/unit_cost/total_amount
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(12, 2);
