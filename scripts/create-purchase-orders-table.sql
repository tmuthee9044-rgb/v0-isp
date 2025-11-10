-- Create purchase_orders table if it doesn't exist
DO $$
BEGIN
    -- Check if purchase_orders table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
        
        RAISE NOTICE 'Creating purchase_orders table...';
        
        CREATE TABLE purchase_orders (
            id BIGSERIAL PRIMARY KEY,
            po_number TEXT UNIQUE NOT NULL,
            supplier_id UUID REFERENCES suppliers(id),
            status TEXT DEFAULT 'pending',
            order_date DATE DEFAULT CURRENT_DATE,
            expected_delivery_date DATE,
            actual_delivery_date DATE,
            total_amount DECIMAL(12,2) DEFAULT 0.00,
            tax_amount DECIMAL(12,2) DEFAULT 0.00,
            discount_amount DECIMAL(12,2) DEFAULT 0.00,
            final_amount DECIMAL(12,2) DEFAULT 0.00,
            currency TEXT DEFAULT 'KES',
            payment_terms INTEGER DEFAULT 30,
            payment_status TEXT DEFAULT 'pending',
            notes TEXT,
            requested_by INTEGER,
            approved_by INTEGER,
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create purchase_order_items table for line items
        CREATE TABLE purchase_order_items (
            id BIGSERIAL PRIMARY KEY,
            purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
            item_name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_price DECIMAL(12,2) NOT NULL,
            received_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
        CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
        CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
        CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);

        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_purchase_orders_updated_at
            BEFORE UPDATE ON purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION update_purchase_orders_updated_at();

        -- Insert sample purchase orders (if suppliers exist)
        INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, expected_delivery_date, total_amount, final_amount, notes)
        SELECT 
            'PO-' || LPAD(ROW_NUMBER() OVER (ORDER BY s.id)::TEXT, 4, '0'),
            s.id,
            CASE WHEN ROW_NUMBER() OVER (ORDER BY s.id) % 3 = 0 THEN 'delivered'
                 WHEN ROW_NUMBER() OVER (ORDER BY s.id) % 3 = 1 THEN 'pending'
                 ELSE 'approved' END,
            CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY s.id) * 5),
            CURRENT_DATE + (ROW_NUMBER() OVER (ORDER BY s.id) * 2),
            (ROW_NUMBER() OVER (ORDER BY s.id) * 15000 + 25000),
            (ROW_NUMBER() OVER (ORDER BY s.id) * 15000 + 25000),
            'Sample purchase order for ' || s.company_name
        FROM suppliers s
        LIMIT 5;

        RAISE NOTICE 'Purchase orders table created successfully with sample data.';
        
    ELSE
        RAISE NOTICE 'Purchase orders table already exists.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating purchase orders table: %', SQLERRM;
END $$;
