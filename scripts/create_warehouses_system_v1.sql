-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    location VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add warehouse_id to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL;

-- Create inventory_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'
    quantity INTEGER NOT NULL,
    from_warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    to_warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_warehouse_id ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_from_warehouse ON inventory_movements(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_to_warehouse ON inventory_movements(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Create trigger to update updated_at timestamp for warehouses
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouses_updated_at();

-- Insert default warehouse if none exists
INSERT INTO warehouses (name, code, location, contact_person)
SELECT 'Main Warehouse', 'WH-001', 'Head Office', 'Inventory Manager'
WHERE NOT EXISTS (SELECT 1 FROM warehouses);

-- Auto-generate warehouse codes
CREATE OR REPLACE FUNCTION generate_warehouse_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'WH-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1 FROM warehouses WHERE code ~ '^WH-[0-9]+$')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_warehouse_code
    BEFORE INSERT ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION generate_warehouse_code();
