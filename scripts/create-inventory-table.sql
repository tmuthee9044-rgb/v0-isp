-- Create inventory table for managing equipment and assets
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    stock_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

-- Insert sample networking equipment
INSERT INTO inventory (name, sku, category, description, stock_quantity, unit_cost, status, supplier) VALUES
('TP-Link Archer C7 Router', 'TPL-AC7-001', 'networking', 'AC1750 Wireless Dual Band Gigabit Router', 25, 8500.00, 'active', 'TP-Link'),
('Ubiquiti UniFi AP AC Lite', 'UBI-UAP-AC-LITE', 'networking', 'Wireless Access Point 802.11ac', 15, 12000.00, 'active', 'Ubiquiti'),
('Mikrotik hEX S Router', 'MIK-RB760IGS', 'networking', '5x Gigabit Ethernet Router with SFP', 20, 15000.00, 'active', 'Mikrotik'),
('Cisco SG108 Switch', 'CIS-SG108-8P', 'networking', '8-Port Gigabit Unmanaged Switch', 30, 4500.00, 'active', 'Cisco'),
('Ubiquiti EdgeRouter X', 'UBI-ER-X', 'networking', '5-Port Router with PoE Passthrough', 18, 6500.00, 'active', 'Ubiquiti'),
('TP-Link EAP225 Access Point', 'TPL-EAP225', 'networking', 'AC1350 Wireless MU-MIMO Gigabit Ceiling Mount', 12, 7500.00, 'active', 'TP-Link'),
('Netgear GS108 Switch', 'NET-GS108', 'networking', '8-Port Gigabit Ethernet Unmanaged Switch', 22, 3500.00, 'active', 'Netgear'),
('Ubiquiti NanoStation M5', 'UBI-NSM5', 'networking', '5GHz airMAX CPE with Dedicated Management Radio', 10, 9500.00, 'active', 'Ubiquiti'),
('Mikrotik PowerBox Pro', 'MIK-RB960PGS-PB', 'networking', 'Outdoor 5x Gigabit Ethernet Router with PoE', 8, 18000.00, 'active', 'Mikrotik'),
('TP-Link TL-SG1016D Switch', 'TPL-SG1016D', 'networking', '16-Port Gigabit Unmanaged Switch', 15, 8500.00, 'active', 'TP-Link')
ON CONFLICT (sku) DO NOTHING;
