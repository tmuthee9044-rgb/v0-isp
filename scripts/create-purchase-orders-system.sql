-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    description TEXT,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    selling_price DECIMAL(10,2) DEFAULT 0.00,
    supplier_id INTEGER REFERENCES suppliers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED')),
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item ON purchase_order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_name, email, phone, address, city) VALUES
('TechSupply Kenya', 'John Kamau', 'john@techsupply.co.ke', '+254700123456', 'Industrial Area', 'Nairobi'),
('Network Solutions Ltd', 'Mary Wanjiku', 'mary@netsolutions.co.ke', '+254722987654', 'Westlands', 'Nairobi'),
('Hardware Plus', 'David Ochieng', 'david@hardwareplus.co.ke', '+254733456789', 'Tom Mboya Street', 'Nairobi')
ON CONFLICT DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory_items (name, sku, category, description, unit_of_measure, minimum_stock, unit_cost, selling_price, supplier_id) VALUES
('Cat6 Ethernet Cable', 'CAB-CAT6-100M', 'Cables', '100m Cat6 Ethernet Cable', 'roll', 5, 2500.00, 3500.00, 1),
('Fiber Optic Cable', 'CAB-FIBER-1KM', 'Cables', '1km Single Mode Fiber Cable', 'roll', 2, 15000.00, 20000.00, 1),
('Network Switch 24-Port', 'SW-24PORT-GIG', 'Switches', '24-Port Gigabit Switch', 'pcs', 3, 8500.00, 12000.00, 2),
('Wireless Router', 'RTR-WIFI-AC1200', 'Routers', 'AC1200 Wireless Router', 'pcs', 10, 4500.00, 6500.00, 2),
('Fiber Splice Closure', 'FSC-24CORE', 'Hardware', '24-Core Fiber Splice Closure', 'pcs', 5, 3200.00, 4500.00, 3),
('Network Rack 42U', 'RACK-42U-STD', 'Racks', '42U Standard Network Rack', 'pcs', 1, 25000.00, 35000.00, 3)
ON CONFLICT (sku) DO NOTHING;

-- Insert sample purchase orders
INSERT INTO purchase_orders (order_number, supplier_id, status, notes, total_amount) VALUES
('PO-2024-0001', 1, 'PENDING', 'Monthly cable order', 45000.00),
('PO-2024-0002', 2, 'APPROVED', 'Network equipment for new site', 85000.00),
('PO-2024-0003', 3, 'RECEIVED', 'Hardware supplies', 32000.00)
ON CONFLICT (order_number) DO NOTHING;

-- Insert sample purchase order items
INSERT INTO purchase_order_items (purchase_order_id, inventory_item_id, quantity, unit_cost) VALUES
(1, 1, 10, 2500.00),
(1, 2, 2, 15000.00),
(2, 3, 5, 8500.00),
(2, 4, 8, 4500.00),
(3, 5, 7, 3200.00),
(3, 6, 1, 25000.00)
ON CONFLICT DO NOTHING;

-- Create trigger to update purchase order total when items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders 
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items 
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for purchase order items
DROP TRIGGER IF EXISTS trigger_update_po_total_insert ON purchase_order_items;
DROP TRIGGER IF EXISTS trigger_update_po_total_update ON purchase_order_items;
DROP TRIGGER IF EXISTS trigger_update_po_total_delete ON purchase_order_items;

CREATE TRIGGER trigger_update_po_total_insert
    AFTER INSERT ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trigger_update_po_total_update
    AFTER UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trigger_update_po_total_delete
    AFTER DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();
