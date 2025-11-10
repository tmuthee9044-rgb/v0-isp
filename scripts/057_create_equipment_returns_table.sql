-- Create equipment_returns table to track return history
CREATE TABLE IF NOT EXISTS equipment_returns (
  id SERIAL PRIMARY KEY,
  customer_equipment_id INTEGER NOT NULL REFERENCES customer_equipment(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  supplier_id UUID REFERENCES suppliers(id),
  serial_number VARCHAR(255),
  return_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  return_condition VARCHAR(50) NOT NULL CHECK (return_condition IN ('working', 'damaged', 'faulty', 'broken', 'missing_parts')),
  return_reason TEXT NOT NULL,
  verified_serial_match BOOLEAN DEFAULT FALSE,
  issued_date DATE,
  days_in_use INTEGER,
  processed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_returns_customer ON equipment_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_returns_supplier ON equipment_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_equipment_returns_condition ON equipment_returns(return_condition);
CREATE INDEX IF NOT EXISTS idx_equipment_returns_date ON equipment_returns(return_date);

-- Add return tracking fields to customer_equipment if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_equipment' AND column_name='return_condition') THEN
    ALTER TABLE customer_equipment ADD COLUMN return_condition VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_equipment' AND column_name='return_reason') THEN
    ALTER TABLE customer_equipment ADD COLUMN return_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_equipment' AND column_name='verified_serial_match') THEN
    ALTER TABLE customer_equipment ADD COLUMN verified_serial_match BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_equipment' AND column_name='inventory_item_id') THEN
    ALTER TABLE customer_equipment ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id);
  END IF;
END $$;

COMMENT ON TABLE equipment_returns IS 'Tracks equipment returns with condition, reason, and supplier traceability';
COMMENT ON COLUMN equipment_returns.return_condition IS 'Condition of equipment when returned: working, damaged, faulty, broken, missing_parts';
COMMENT ON COLUMN equipment_returns.verified_serial_match IS 'Whether the serial number matches the originally issued equipment';
COMMENT ON COLUMN equipment_returns.days_in_use IS 'Number of days the equipment was in use before return';
