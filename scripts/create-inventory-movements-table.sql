-- Create inventory_movements table for tracking stock operations
-- This table is required for the inventory operations functionality

-- Create inventory_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL,                    -- 'in', 'out', 'transfer', 'adjustment', 'return'
    quantity INTEGER NOT NULL,                      -- positive for in, negative for out
    from_location TEXT,                             -- source location for transfers
    to_location TEXT,                               -- destination location for transfers
    reason TEXT,                                    -- reason for the movement
    reference_number TEXT,                          -- optional reference (PO number, etc.)
    unit_cost DECIMAL(10,2),                       -- cost per unit at time of movement
    total_cost DECIMAL(10,2),                      -- total cost of movement
    status TEXT DEFAULT 'completed',               -- 'pending', 'completed', 'cancelled'
    performed_by TEXT DEFAULT 'System',            -- who performed the operation
    notes TEXT,                                     -- additional notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_status ON inventory_movements(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_inventory_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_movements_updated_at ON inventory_movements;
CREATE TRIGGER trigger_inventory_movements_updated_at
    BEFORE UPDATE ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_movements_updated_at();

-- Insert some sample data for testing
INSERT INTO inventory_movements (item_id, movement_type, quantity, reason, performed_by) 
SELECT 
    ii.id,
    'adjustment',
    CASE WHEN ii.quantity_in_stock > 0 THEN ii.quantity_in_stock ELSE 10 END,
    'Initial stock adjustment',
    'System'
FROM inventory_items ii
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_movements im WHERE im.item_id = ii.id
)
LIMIT 10;

-- Log table creation
DO $$
BEGIN
    RAISE NOTICE 'inventory_movements table created successfully with indexes and sample data';
END $$;
