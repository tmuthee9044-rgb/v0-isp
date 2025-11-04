-- Create suppliers table for inventory management
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  tax_id TEXT,
  payment_terms INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add supplier_id column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);

-- Insert a default supplier for existing inventory items
INSERT INTO suppliers (name, company_name, contact_name, is_active) 
VALUES ('Default Supplier', 'Default Supplier Co.', 'System Admin', true)
ON CONFLICT DO NOTHING;

-- Test data: Add a few sample suppliers
INSERT INTO suppliers (name, company_name, contact_name, phone, email, is_active) VALUES
('TechCorp Solutions', 'TechCorp Solutions Ltd.', 'John Smith', '+1-555-0101', 'john@techcorp.com', true),
('Network Supplies Inc', 'Network Supplies Inc.', 'Sarah Johnson', '+1-555-0102', 'sarah@networksupplies.com', true),
('Fiber Optics Pro', 'Fiber Optics Pro LLC', 'Mike Chen', '+1-555-0103', 'mike@fiberopticspro.com', true)
ON CONFLICT DO NOTHING;

-- Test: Verify suppliers table exists and has data
SELECT 'Suppliers table created successfully' as status, COUNT(*) as supplier_count FROM suppliers;
