-- Create warehouses table if it doesn't exist
DO $$
BEGIN
    -- Check if warehouses table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        
        RAISE NOTICE 'Creating warehouses table...';
        
        CREATE TABLE warehouses (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            description TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT DEFAULT 'Kenya',
            postal_code TEXT,
            contact_person TEXT,
            phone_number TEXT,
            email TEXT,
            capacity_cubic_meters DECIMAL(10,2),
            current_utilization DECIMAL(5,2) DEFAULT 0.00,
            warehouse_type TEXT DEFAULT 'general',
            status TEXT DEFAULT 'active',
            manager_id INTEGER,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
        CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
        CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_warehouses_updated_at
            BEFORE UPDATE ON warehouses
            FOR EACH ROW
            EXECUTE FUNCTION update_warehouses_updated_at();

        -- Insert default warehouses
        INSERT INTO warehouses (name, code, description, address, city, state, country, contact_person, phone_number) VALUES
        ('Main Warehouse', 'WH-001', 'Primary storage facility', 'Industrial Area, Nairobi', 'Nairobi', 'Nairobi County', 'Kenya', 'John Kamau', '+254712345678'),
        ('Nakuru Branch Warehouse', 'WH-002', 'Nakuru regional storage', 'Nakuru Industrial Area', 'Nakuru', 'Nakuru County', 'Kenya', 'Mary Wanjiku', '+254723456789'),
        ('Mombasa Warehouse', 'WH-003', 'Coastal region storage', 'Changamwe, Mombasa', 'Mombasa', 'Mombasa County', 'Kenya', 'Ahmed Hassan', '+254734567890');

        RAISE NOTICE 'Warehouses table created successfully with sample data.';
        
    ELSE
        RAISE NOTICE 'Warehouses table already exists.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating warehouses table: %', SQLERRM;
END $$;
