-- Enhanced inventory lifecycle and warehouse operations schema

-- Create warehouses table first (required for foreign keys)
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Kenya',
    manager_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    capacity_cubic_meters NUMERIC(10,2),
    current_utilization_percent NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create customer_equipment table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    inventory_item_id INTEGER,
    serial_number VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    issued_date DATE DEFAULT CURRENT_DATE,
    returned_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Serial Numbers tracking table
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    mac_address VARCHAR(50),
    imei VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, issued, maintenance, retired, lost
    condition_status VARCHAR(20) DEFAULT 'new', -- new, good, fair, poor, damaged, defective
    warranty_start_date DATE,
    warranty_end_date DATE,
    purchase_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    location_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock Reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    reserved_quantity INTEGER NOT NULL,
    reservation_type VARCHAR(50) NOT NULL, -- customer_order, maintenance, transfer, installation
    reference_id INTEGER, -- ID of the related record (customer_id, work_order_id, etc.)
    reserved_by INTEGER,
    reserved_until TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- active, fulfilled, cancelled, expired
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock Adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_number VARCHAR(100) UNIQUE NOT NULL,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    adjustment_type VARCHAR(20) NOT NULL, -- increase, decrease, correction
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    adjustment_quantity INTEGER NOT NULL,
    unit_cost NUMERIC(15,2),
    total_value NUMERIC(15,2),
    reason VARCHAR(100) NOT NULL, -- damaged, expired, theft, found, correction, etc.
    description TEXT,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    performed_by INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inter-warehouse Transfers table
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    transfer_date DATE NOT NULL,
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_transit, received, cancelled
    total_items INTEGER DEFAULT 0,
    total_value NUMERIC(15,2) DEFAULT 0,
    initiated_by INTEGER,
    received_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Transfer Items table
CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    quantity_requested INTEGER NOT NULL,
    quantity_sent INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    unit_cost NUMERIC(15,2),
    total_cost NUMERIC(15,2),
    serial_numbers TEXT[], -- Array of serial numbers for serialized items
    condition_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inventory Audit Logs table
CREATE TABLE IF NOT EXISTS inventory_audit_logs (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    action VARCHAR(50) NOT NULL, -- created, updated, moved, reserved, issued, returned, adjusted
    old_values JSONB,
    new_values JSONB,
    quantity_change INTEGER DEFAULT 0,
    performed_by INTEGER,
    ip_address INET,
    user_agent TEXT,
    reference_type VARCHAR(50), -- customer_order, purchase_order, transfer, adjustment
    reference_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Maintenance Schedules table
CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    serial_number_id INTEGER REFERENCES inventory_serial_numbers(id),
    maintenance_type VARCHAR(50) NOT NULL, -- preventive, corrective, inspection
    frequency_days INTEGER, -- How often maintenance is needed
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add enhanced status options and lifecycle tracking
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) DEFAULT 'active', -- active, deprecated, discontinued, obsolete
ADD COLUMN IF NOT EXISTS last_audit_date DATE,
ADD COLUMN IF NOT EXISTS next_audit_date DATE,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS economic_order_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS abc_classification VARCHAR(1), -- A, B, C classification for inventory management
ADD COLUMN IF NOT EXISTS seasonal_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hazardous_material BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_requirements TEXT;

-- Enhanced customer equipment tracking
ALTER TABLE customer_equipment 
ADD COLUMN IF NOT EXISTS installation_date DATE,
ADD COLUMN IF NOT EXISTS maintenance_due_date DATE,
ADD COLUMN IF NOT EXISTS replacement_due_date DATE,
ADD COLUMN IF NOT EXISTS condition_rating INTEGER DEFAULT 5, -- 1-5 scale
ADD COLUMN IF NOT EXISTS location_notes TEXT,
ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- Create comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_item_id ON inventory_serial_numbers(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_status ON inventory_serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_serial ON inventory_serial_numbers(serial_number);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_item_warehouse ON stock_reservations(inventory_item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item_warehouse ON stock_adjustments(inventory_item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_date ON warehouse_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_item_id ON inventory_audit_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_action ON inventory_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_created_at ON inventory_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_date ON equipment_maintenance_schedules(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_lifecycle ON inventory_items(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_inventory_items_abc ON inventory_items(abc_classification);

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION log_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO inventory_audit_logs (
            inventory_item_id, action, new_values, performed_by
        ) VALUES (
            NEW.id, 'created', to_jsonb(NEW), 1
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO inventory_audit_logs (
            inventory_item_id, action, old_values, new_values, performed_by
        ) VALUES (
            NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), 1
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO inventory_audit_logs (
            inventory_item_id, action, old_values, performed_by
        ) VALUES (
            OLD.id, 'deleted', to_jsonb(OLD), 1
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS inventory_items_audit_trigger ON inventory_items;
CREATE TRIGGER inventory_items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_changes();

-- Insert sample warehouse data if none exists
INSERT INTO warehouses (warehouse_code, name, address, status)
SELECT 'MAIN', 'Main Warehouse', 'Main Office Location', 'active'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_code = 'MAIN');

INSERT INTO warehouses (warehouse_code, name, address, status)
SELECT 'BRANCH1', 'Branch Office Warehouse', 'Branch Office Location', 'active'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_code = 'BRANCH1');

INSERT INTO warehouses (warehouse_code, name, address, status)
SELECT 'FIELD', 'Field Equipment Storage', 'Mobile/Field Storage', 'active'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_code = 'FIELD');
