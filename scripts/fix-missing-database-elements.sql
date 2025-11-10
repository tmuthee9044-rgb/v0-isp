-- Fix missing database elements for inventory and service plans
-- This script creates the inventory_items table and adds missing columns to service_plans

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    supplier VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    warranty_period INTEGER, -- in months
    purchase_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Add missing columns to service_plans table
-- Adding speed_down and speed_up columns for backward compatibility
ALTER TABLE service_plans 
ADD COLUMN IF NOT EXISTS speed_down INTEGER,
ADD COLUMN IF NOT EXISTS speed_up INTEGER;

-- Update existing records to populate speed_down and speed_up from download_speed and upload_speed
UPDATE service_plans 
SET 
    speed_down = download_speed,
    speed_up = upload_speed
WHERE speed_down IS NULL OR speed_up IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON inventory_items(serial_number);
CREATE INDEX IF NOT EXISTS idx_service_plans_speed_down ON service_plans(speed_down);
CREATE INDEX IF NOT EXISTS idx_service_plans_speed_up ON service_plans(speed_up);

-- Insert sample inventory items
INSERT INTO inventory_items (name, category, brand, model, description, unit_price, quantity_in_stock, minimum_stock_level, supplier, location, status) VALUES
('Wireless Router AC1200', 'Network Equipment', 'TP-Link', 'Archer C6', 'Dual-band wireless router with AC1200 speeds', 45.99, 25, 5, 'Tech Distributors Ltd', 'Main Warehouse', 'active'),
('Fiber Optic Cable 100m', 'Fiber Optic Equipment', 'Corning', 'SMF-28e+', 'Single-mode fiber optic cable 100 meter roll', 89.50, 15, 3, 'Fiber Solutions Inc', 'Main Warehouse', 'active'),
('Network Switch 24-Port', 'Network Equipment', 'Cisco', 'SG250-24', '24-port Gigabit managed switch', 199.99, 8, 2, 'Cisco Partner', 'Main Warehouse', 'active'),
('ONT Device', 'Customer Equipment', 'Huawei', 'HG8245H', 'Optical Network Terminal for FTTH', 65.00, 50, 10, 'Huawei Kenya', 'Main Warehouse', 'active'),
('Ethernet Cable Cat6 305m', 'Cables', 'Panduit', 'UTP6A', 'Category 6A UTP cable 305m box', 120.00, 12, 2, 'Panduit East Africa', 'Main Warehouse', 'active'),
('Power Adapter 12V 2A', 'Power Equipment', 'Generic', 'PA-12V2A', '12V 2A power adapter for network devices', 8.50, 100, 20, 'Local Electronics', 'Main Warehouse', 'active'),
('Fiber Splice Closure', 'Fiber Optic Equipment', '3M', 'FSC-24', '24-fiber splice closure for outdoor use', 45.00, 20, 5, '3M Kenya', 'Main Warehouse', 'active'),
('Wireless Access Point', 'Network Equipment', 'Ubiquiti', 'UAP-AC-LR', 'Long-range wireless access point', 149.99, 15, 3, 'Ubiquiti Distributor', 'Main Warehouse', 'active'),
('Fiber Optic Connector SC/UPC', 'Fiber Optic Equipment', 'Corning', 'SC-UPC-SM', 'SC/UPC single-mode fiber connector', 2.50, 200, 50, 'Fiber Solutions Inc', 'Main Warehouse', 'active'),
('Network Cable Tester', 'Testing Equipment', 'Fluke', 'LinkRunner G2', 'Network cable and connectivity tester', 899.99, 3, 1, 'Fluke Networks', 'Main Warehouse', 'active');

-- Add comments to tables
COMMENT ON TABLE inventory_items IS 'Inventory management for ISP equipment and supplies';
COMMENT ON COLUMN service_plans.speed_down IS 'Download speed in Mbps (backward compatibility)';
COMMENT ON COLUMN service_plans.speed_up IS 'Upload speed in Mbps (backward compatibility)';

-- Success message
SELECT 'Database elements created successfully!' as status;
