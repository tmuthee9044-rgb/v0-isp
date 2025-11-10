-- Creating comprehensive supplier and procurement management schema

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_number VARCHAR(100),
    payment_terms INTEGER DEFAULT 30, -- days
    credit_limit NUMERIC(15,2) DEFAULT 0,
    supplier_type VARCHAR(50) DEFAULT 'vendor', -- vendor, manufacturer, distributor
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    rating INTEGER DEFAULT 0, -- 1-5 star rating
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    shipping_cost NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, confirmed, partially_received, received, cancelled
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    delivery_address TEXT,
    notes TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, received, cancelled
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Goods Receiving table
CREATE TABLE IF NOT EXISTS goods_receiving (
    id SERIAL PRIMARY KEY,
    receiving_number VARCHAR(100) UNIQUE NOT NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    received_date DATE NOT NULL,
    received_by INTEGER,
    delivery_note_number VARCHAR(100),
    condition_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, discrepancy
    total_items_expected INTEGER DEFAULT 0,
    total_items_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Goods Receiving Items table
CREATE TABLE IF NOT EXISTS goods_receiving_items (
    id SERIAL PRIMARY KEY,
    goods_receiving_id INTEGER REFERENCES goods_receiving(id) ON DELETE CASCADE,
    purchase_order_item_id INTEGER REFERENCES purchase_order_items(id),
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    expected_quantity INTEGER NOT NULL,
    received_quantity INTEGER NOT NULL,
    unit_cost NUMERIC(15,2) NOT NULL,
    total_cost NUMERIC(15,2) NOT NULL,
    condition_status VARCHAR(20) DEFAULT 'good', -- good, damaged, defective
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Supplier Invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    goods_receiving_id INTEGER REFERENCES goods_receiving(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, overdue, cancelled
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Enhanced Inventory Movements table (if not exists)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    movement_type VARCHAR(20) NOT NULL, -- in, out, adjustment, transfer
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15,2),
    total_value NUMERIC(15,2),
    reference_type VARCHAR(50), -- purchase_order, customer_allocation, adjustment, transfer
    reference_id INTEGER,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    batch_number VARCHAR(100),
    serial_numbers TEXT[], -- Array of serial numbers
    reason TEXT,
    notes TEXT,
    performed_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    manager_id INTEGER,
    phone VARCHAR(50),
    email VARCHAR(255),
    capacity_cubic_meters NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inventory Locations table (for tracking items within warehouses)
CREATE TABLE IF NOT EXISTS inventory_locations (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    location_code VARCHAR(100), -- e.g., A1-B2-C3 (Aisle-Rack-Shelf)
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- Reserved for pending orders
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(inventory_item_id, warehouse_id, location_code)
);

-- Customer Equipment table enhancements (if not exists)
CREATE TABLE IF NOT EXISTS customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100),
    serial_number VARCHAR(255),
    mac_address VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15,2),
    total_price NUMERIC(15,2),
    issued_date DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'allocated', -- allocated, issued, returned, damaged, lost
    condition_notes TEXT,
    warranty_expiry DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add missing columns to inventory_items if they don't exist
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(255),
ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100),
ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT 0, -- months
ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_type ON suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_goods_receiving_po_id ON goods_receiving(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_item_warehouse ON inventory_locations(inventory_item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_status ON customer_equipment(status);

-- Insert default warehouse if none exists
INSERT INTO warehouses (warehouse_code, name, address, status)
SELECT 'MAIN', 'Main Warehouse', 'Head Office', 'active'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_code = 'MAIN');

-- Update existing inventory items to have default warehouse location
INSERT INTO inventory_locations (inventory_item_id, warehouse_id, quantity, location_code)
SELECT 
    ii.id,
    w.id,
    ii.stock_quantity,
    'DEFAULT'
FROM inventory_items ii
CROSS JOIN warehouses w
WHERE w.warehouse_code = 'MAIN'
AND NOT EXISTS (
    SELECT 1 FROM inventory_locations il 
    WHERE il.inventory_item_id = ii.id AND il.warehouse_id = w.id
);
