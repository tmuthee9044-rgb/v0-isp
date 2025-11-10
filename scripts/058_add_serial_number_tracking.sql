-- Add serial number tracking to inventory items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS requires_serial_number BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS serial_numbers JSONB DEFAULT '[]'::jsonb;

-- Create inventory_serial_numbers table for detailed tracking
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
  serial_number VARCHAR(255) UNIQUE NOT NULL,
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  received_date DATE,
  status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, assigned, returned, faulty
  customer_equipment_id INTEGER REFERENCES customer_equipment(id),
  assigned_date DATE,
  returned_date DATE,
  return_condition VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update customer_equipment to link to serial numbers
ALTER TABLE customer_equipment
ADD COLUMN IF NOT EXISTS inventory_serial_number_id INTEGER REFERENCES inventory_serial_numbers(id);

-- Update equipment_returns to link to serial numbers
ALTER TABLE equipment_returns
ADD COLUMN IF NOT EXISTS inventory_serial_number_id INTEGER REFERENCES inventory_serial_numbers(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item ON inventory_serial_numbers(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON inventory_serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_supplier ON inventory_serial_numbers(supplier_id);

COMMENT ON TABLE inventory_serial_numbers IS 'Tracks individual serial numbers for inventory items from supplier to customer';
COMMENT ON COLUMN inventory_items.requires_serial_number IS 'Whether this item requires serial number tracking';
