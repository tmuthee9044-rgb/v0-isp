-- Create inventory_items table for ISP equipment management
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    location VARCHAR(255) DEFAULT 'Main Warehouse',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    description TEXT,
    specifications TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);

-- Insert sample inventory data for ISP equipment
INSERT INTO inventory_items (name, category, sku, stock_quantity, unit_cost, location, status, description, specifications) VALUES
('Cisco ISR 4331 Router', 'Network Equipment', 'CSC-ISR4331', 5, 1299.00, 'Main Warehouse', 'active', 'Enterprise-grade router for business connections', '4-port Gigabit Ethernet, VPN support, QoS'),
('TP-Link Archer C7 Router', 'Network Equipment', 'TPL-AC7', 15, 85.00, 'Main Warehouse', 'active', 'Dual-band wireless router for home use', 'AC1750, 3x3 MIMO, USB ports'),
('Netgear CM500 Modem', 'Network Equipment', 'NTG-CM500', 12, 65.00, 'Main Warehouse', 'active', 'DOCSIS 3.0 cable modem', '16x4 channel bonding, Gigabit Ethernet'),
('Corning Fiber Optic Cable', 'Fiber Optic Equipment', 'COR-FOC-SM', 1000, 2.50, 'Main Warehouse', 'active', 'Single-mode fiber optic cable per meter', 'OS2 9/125μm, LSZH jacket'),
('Ubiquiti UniFi AP AC Pro', 'Wireless Equipment', 'UBI-UAP-AC-PRO', 8, 185.00, 'Main Warehouse', 'active', 'Enterprise wireless access point', '802.11ac Wave 2, 3x3 MIMO, PoE+'),
('Ethernet Cable Cat6', 'Network Equipment', 'ETH-CAT6-1M', 500, 1.50, 'Main Warehouse', 'active', 'Cat6 Ethernet cable per meter', '23 AWG, 550MHz, RJ45 connectors'),
('APC UPS 1500VA', 'Power Equipment', 'APC-UPS-1500', 6, 250.00, 'Main Warehouse', 'active', 'Uninterruptible power supply', '1500VA/980W, LCD display, USB monitoring'),
('Mikrotik hEX S Router', 'Network Equipment', 'MIK-HEXS', 10, 89.00, 'Main Warehouse', 'active', 'Gigabit Ethernet router with SFP port', '5x Gigabit ports, SFP, USB, PoE out'),
('Fiber Splice Closure', 'Fiber Optic Equipment', 'FSC-24F', 20, 45.00, 'Main Warehouse', 'active', '24-fiber splice closure', 'IP68 rated, mechanical seal, 24 splice trays'),
('Optical Network Terminal', 'Fiber Optic Equipment', 'ONT-GPON-4P', 25, 75.00, 'Main Warehouse', 'active', 'GPON ONT with 4 Ethernet ports', 'GPON, 4x GE ports, WiFi, VoIP ready'),
('Patch Panel 24 Port', 'Network Equipment', 'PP-24P-CAT6', 15, 35.00, 'Main Warehouse', 'active', '24-port Cat6 patch panel', '1U rack mount, 110 punch down, labeled'),
('Network Switch 24 Port', 'Network Equipment', 'SW-24P-GIG', 8, 120.00, 'Main Warehouse', 'active', '24-port Gigabit managed switch', '24x GE ports, 4x SFP+, VLAN, QoS'),
('Coaxial Cable RG6', 'Network Equipment', 'COAX-RG6-1M', 300, 1.20, 'Main Warehouse', 'active', 'RG6 coaxial cable per meter', '75 ohm, quad shield, PE jacket'),
('Satellite Dish 90cm', 'Satellite Equipment', 'SAT-DISH-90', 12, 85.00, 'Main Warehouse', 'active', '90cm satellite dish with LNB', 'Ku-band, offset feed, weather resistant'),
('Power Injector PoE+', 'Power Equipment', 'POE-INJ-30W', 20, 25.00, 'Main Warehouse', 'active', '30W PoE+ power injector', '802.3at, Gigabit passthrough, wall mount');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_items_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE inventory_items IS 'Inventory management for ISP equipment and supplies';
COMMENT ON COLUMN inventory_items.sku IS 'Stock Keeping Unit - unique identifier for inventory tracking';
COMMENT ON COLUMN inventory_items.unit_cost IS 'Cost per unit in the system currency';
COMMENT ON COLUMN inventory_items.stock_quantity IS 'Current available quantity in stock';
COMMENT ON COLUMN inventory_items.specifications IS 'Technical specifications and features';
