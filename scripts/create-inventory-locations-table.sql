-- Trust Waves ISP Management System
-- Migration: Create inventory_locations table and integrate with inventory table
-- This script is idempotent and safe to run multiple times

DO $$
BEGIN
    -- Check if inventory_locations table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_locations') THEN
        -- Updated table schema to include address, contact_person, and phone_number fields
        CREATE TABLE inventory_locations (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,                -- e.g. "Nakuru Store", "Olkalau Depot"
            description TEXT,                         -- optional details
            address TEXT,                             -- physical address if needed
            contact_person TEXT,                      -- optional responsible staff
            phone_number TEXT,                        -- optional contact
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create index for performance
        CREATE INDEX idx_inventory_locations_name ON inventory_locations(name);

        -- Updated default locations with address and contact information
        INSERT INTO inventory_locations (name, description, address, contact_person, phone_number) VALUES
            ('Main Warehouse', 'Primary storage facility', 'Nakuru Main Office', 'John Doe', '+254700000001'),
            ('Ndaragwa Store', 'Ndaragwa branch office storage', 'Ndaragwa Town Center', 'Jane Smith', '+254700000002'),
            ('Nakuru Hub', 'Nakuru distribution center', 'Nakuru Industrial Area', 'Mike Johnson', '+254700000003'),
            ('Olkalau Depot', 'Olkalau service depot', 'Olkalau Trading Center', 'Sarah Wilson', '+254700000004'),
            ('Field Storage', 'Mobile/temporary storage location', 'Various Locations', 'Field Team', '+254700000000');

        -- Log the creation
        RAISE NOTICE 'System Migration: Created missing table inventory_locations with address and contact fields';
    ELSE
        RAISE NOTICE 'Table inventory_locations already exists, skipping creation';
    END IF;

    -- Check if location_id column exists in inventory table
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'location_id'
    ) THEN
        -- Add location_id column to inventory table
        ALTER TABLE inventory_items 
        ADD COLUMN location_id BIGINT REFERENCES inventory_locations(id) ON DELETE SET NULL;

        -- Create index for performance
        CREATE INDEX idx_inventory_items_location_id ON inventory_items(location_id);

        -- Update existing inventory items to use Main Warehouse as default
        UPDATE inventory_items 
        SET location_id = (SELECT id FROM inventory_locations WHERE name = 'Main Warehouse' LIMIT 1)
        WHERE location_id IS NULL;

        RAISE NOTICE 'System Migration: Added location_id column to inventory_items table';
    ELSE
        RAISE NOTICE 'Column location_id already exists in inventory_items table, skipping addition';
    END IF;

    -- Create updated_at trigger for inventory_locations if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'update_inventory_locations_updated_at'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_inventory_locations_updated_at
            BEFORE UPDATE ON inventory_locations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'System Migration: Created updated_at trigger for inventory_locations';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during inventory_locations migration: %', SQLERRM;
        -- Don't re-raise the error to prevent system crashes
END $$;
