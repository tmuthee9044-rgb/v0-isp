-- Fix Missing Database Schema Elements
-- This script adds missing tables and columns that are causing errors

-- 1. Create inventory_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
    inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    from_location TEXT,
    to_location TEXT,
    reason TEXT,
    reference_number TEXT,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    status TEXT DEFAULT 'completed',
    performed_by TEXT DEFAULT 'System',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_status ON inventory_movements(status);

-- 2. Create invoice_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    service_id INTEGER REFERENCES customer_services(id),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

-- 3. Add quantity_received column to purchase_order_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'quantity_received'
    ) THEN
        ALTER TABLE purchase_order_items 
        ADD COLUMN quantity_received INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added quantity_received column to purchase_order_items';
    ELSE
        RAISE NOTICE 'quantity_received column already exists in purchase_order_items';
    END IF;
END $$;

-- 4. Add created_at column to account_balances if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_balances' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE account_balances 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added created_at column to account_balances';
    ELSE
        RAISE NOTICE 'created_at column already exists in account_balances';
    END IF;
END $$;

-- 5. Create trigger for inventory_movements updated_at
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

-- 6. Verify tables and columns exist
DO $$
DECLARE
    movements_exists BOOLEAN;
    invoice_items_exists BOOLEAN;
    quantity_received_exists BOOLEAN;
    created_at_exists BOOLEAN;
BEGIN
    -- Check if inventory_movements exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'inventory_movements'
    ) INTO movements_exists;
    
    -- Check if invoice_items exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'invoice_items'
    ) INTO invoice_items_exists;
    
    -- Check if quantity_received column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'quantity_received'
    ) INTO quantity_received_exists;
    
    -- Check if created_at column exists in account_balances
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_balances' 
        AND column_name = 'created_at'
    ) INTO created_at_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Schema Verification Results:';
    RAISE NOTICE '========================================';
    
    IF movements_exists THEN
        RAISE NOTICE '✓ inventory_movements table exists';
    ELSE
        RAISE WARNING '✗ inventory_movements table does NOT exist';
    END IF;
    
    IF invoice_items_exists THEN
        RAISE NOTICE '✓ invoice_items table exists';
    ELSE
        RAISE WARNING '✗ invoice_items table does NOT exist';
    END IF;
    
    IF quantity_received_exists THEN
        RAISE NOTICE '✓ purchase_order_items.quantity_received column exists';
    ELSE
        RAISE WARNING '✗ purchase_order_items.quantity_received column does NOT exist';
    END IF;
    
    IF created_at_exists THEN
        RAISE NOTICE '✓ account_balances.created_at column exists';
    ELSE
        RAISE WARNING '✗ account_balances.created_at column does NOT exist';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database schema fixes completed successfully';
    RAISE NOTICE 'Run this script against your database to apply all fixes';
END $$;
