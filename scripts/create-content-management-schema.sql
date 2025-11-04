-- Content Management and Customer Approval Database Schema
-- This script creates the necessary tables for content management and customer approval workflow

-- Create company_content table for storing Terms of Service and Privacy Policy content
CREATE TABLE IF NOT EXISTS company_content (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) UNIQUE NOT NULL, -- 'terms', 'privacy', etc.
    content JSONB NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create customer_equipment table for tracking equipment issued to customers
CREATE TABLE IF NOT EXISTS customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    inventory_item_id INTEGER, -- References inventory_items table
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100),
    serial_number VARCHAR(255),
    mac_address VARCHAR(17),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    issued_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    return_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50) DEFAULT 'issued', -- 'issued', 'returned', 'damaged', 'lost'
    condition_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create customer_logs table for tracking customer actions and status changes
CREATE TABLE IF NOT EXISTS customer_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'approved', 'rejected', 'activated', 'suspended', etc.
    description TEXT,
    performed_by INTEGER REFERENCES users(id),
    metadata JSONB, -- Additional data like equipment issued, reason for action, etc.
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table if it doesn't exist (for equipment management)
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(255),
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(10,2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    unit VARCHAR(50) DEFAULT 'piece',
    supplier VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'discontinued', 'out_of_stock'
    specifications JSONB,
    warranty_period INTEGER, -- in months
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create inventory_movements table for tracking stock changes
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'customer_issue', 'purchase', 'return', 'adjustment'
    reference_id INTEGER, -- ID of related record (customer_id, purchase_id, etc.)
    unit_price NUMERIC(10,2),
    total_value NUMERIC(10,2),
    notes TEXT,
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_content_type ON company_content(type);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_status ON customer_equipment(status);
CREATE INDEX IF NOT EXISTS idx_customer_logs_customer_id ON customer_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_logs_action ON customer_logs(action);
CREATE INDEX IF NOT EXISTS idx_customer_logs_created_at ON customer_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Insert default content for Terms of Service
INSERT INTO company_content (type, content) VALUES (
    'terms',
    '{
        "title": "Terms of Service",
        "lastUpdated": "' || CURRENT_DATE || '",
        "content": {
            "introduction": "Welcome to Trust Waves ISP. These Terms of Service govern your use of our internet services and website. By using our services, you agree to be bound by these Terms.",
            "serviceDescription": "Trust Waves ISP provides high-speed internet connectivity services to residential and business customers. Our services include but are not limited to broadband internet access, technical support, and customer portal access.",
            "userResponsibilities": "As a customer, you agree to: (1) Use our services in compliance with all applicable laws and regulations; (2) Pay all fees and charges on time; (3) Protect your account credentials; (4) Not engage in activities that may harm our network or other users; (5) Comply with our Acceptable Use Policy.",
            "paymentTerms": "Service fees are billed monthly in advance. Payment is due within 30 days of the invoice date. Late payments may result in service suspension or termination. We reserve the right to change our pricing with 30 days written notice.",
            "serviceAvailability": "While we strive to provide continuous service, we do not guarantee 100% uptime. Scheduled maintenance will be announced in advance when possible. We are not liable for service interruptions due to circumstances beyond our control.",
            "privacyPolicy": "Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. By using our services, you consent to our privacy practices.",
            "termination": "Either party may terminate this agreement with 30 days written notice. We may terminate immediately for breach of terms, non-payment, or illegal activities. Upon termination, you must return all equipment provided by us.",
            "limitation": "Our liability is limited to the monthly service fee. We are not liable for indirect, incidental, or consequential damages. Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.",
            "changes": "We may modify these Terms at any time. Changes will be posted on our website and take effect 30 days after posting. Continued use of our services constitutes acceptance of the modified Terms.",
            "contact": "If you have questions about these Terms, please contact us at legal@trustwavesisp.com or call our customer service at +254 700 000 000."
        }
    }'::jsonb
) ON CONFLICT (type) DO NOTHING;

-- Insert default content for Privacy Policy
INSERT INTO company_content (type, content) VALUES (
    'privacy',
    '{
        "title": "Privacy Policy",
        "lastUpdated": "' || CURRENT_DATE || '",
        "content": {
            "introduction": "At Trust Waves ISP, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.",
            "informationCollection": "We collect information you provide directly to us, such as when you create an account, contact customer service, or use our services. This includes personal information like your name, email address, phone number, billing address, and payment information. We also automatically collect certain information about your device and usage patterns.",
            "informationUse": "We use your information to: (1) Provide and maintain our services; (2) Process payments and billing; (3) Communicate with you about your account and services; (4) Improve our services and customer experience; (5) Comply with legal obligations; (6) Protect against fraud and unauthorized access.",
            "informationSharing": "We do not sell, trade, or rent your personal information to third parties. We may share your information with: (1) Service providers who assist us in operating our business; (2) Law enforcement when required by law; (3) Business partners for joint services with your consent; (4) In connection with a business transfer or merger.",
            "dataSecurity": "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
            "cookies": "Our website uses cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences, though some features may not function properly if cookies are disabled.",
            "userRights": "You have the right to: (1) Access and review your personal information; (2) Request corrections to inaccurate information; (3) Request deletion of your information (subject to legal requirements); (4) Opt-out of marketing communications; (5) Data portability where applicable.",
            "dataRetention": "We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Account information is typically retained for the duration of your service agreement plus applicable legal retention periods.",
            "childrenPrivacy": "Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.",
            "changes": "We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the \"Last Updated\" date. Your continued use of our services constitutes acceptance of the updated policy.",
            "contact": "If you have questions about this Privacy Policy or our privacy practices, please contact our Data Protection Officer at privacy@trustwavesisp.com or call +254 700 000 000."
        }
    }'::jsonb
) ON CONFLICT (type) DO NOTHING;

-- Insert sample inventory items for equipment management
INSERT INTO inventory_items (name, category, description, sku, price, stock_quantity, min_stock_level, specifications) VALUES
('TP-Link Archer C7 Router', 'Network Equipment', 'AC1750 Wireless Dual Band Gigabit Router', 'RTR-TPC7-001', 8500.00, 25, 5, '{"wifi_standard": "802.11ac", "max_speed": "1750Mbps", "ports": "4x Gigabit LAN", "antennas": 3}'),
('Mikrotik hEX S Router', 'Network Equipment', 'Gigabit Ethernet Router with SFP port', 'RTR-MIK-HEX', 12000.00, 15, 3, '{"ports": "5x Gigabit", "sfp": true, "poe": false, "cpu": "880MHz"}'),
('Ubiquiti UniFi AP AC Lite', 'Network Equipment', 'Wireless Access Point 802.11ac', 'AP-UBI-ACL', 6500.00, 30, 8, '{"wifi_standard": "802.11ac", "max_speed": "1167Mbps", "poe": "802.3af", "range": "122m"}'),
('Cat6 Ethernet Cable 50m', 'Cables', 'Category 6 UTP Cable 50 meter roll', 'CBL-CAT6-50', 3500.00, 40, 10, '{"category": "Cat6", "length": "50m", "type": "UTP", "color": "Blue"}'),
('Fiber Optic Cable SC-SC 10m', 'Fiber Optic Equipment', 'Single Mode Fiber Cable SC to SC', 'FBR-SC-10M', 2500.00, 20, 5, '{"type": "Single Mode", "connectors": "SC-SC", "length": "10m", "core": "9/125"}'),
('Power Injector 24V 1A', 'Power Equipment', '24V 1A PoE Injector for Access Points', 'PWR-INJ-24V', 1500.00, 35, 10, '{"voltage": "24V", "current": "1A", "power": "24W", "connector": "RJ45"}'),
('Ethernet Switch 8-Port', 'Network Equipment', '8-Port Gigabit Ethernet Switch', 'SWT-8PT-GIG', 4500.00, 20, 5, '{"ports": "8x Gigabit", "managed": false, "poe": false, "backplane": "16Gbps"}'),
('Coaxial Cable RG6 100m', 'Cables', 'RG6 Coaxial Cable 100 meter roll', 'CBL-RG6-100', 4000.00, 15, 3, '{"type": "RG6", "length": "100m", "impedance": "75 ohm", "shielding": "Quad Shield"}'),
('Antenna Omni 9dBi', 'Antennas', '2.4GHz Omnidirectional Antenna 9dBi', 'ANT-OMN-9DB', 2800.00, 12, 3, '{"frequency": "2.4GHz", "gain": "9dBi", "type": "Omnidirectional", "connector": "N-Female"}'),
('Cable Tester RJ45', 'Tools', 'Network Cable Tester for RJ45 cables', 'TST-CBL-RJ45', 3200.00, 8, 2, '{"type": "Cable Tester", "connectors": "RJ45", "features": "Continuity, Wiring Map", "battery": "9V"}'
) ON CONFLICT (sku) DO NOTHING;

-- Add triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_company_content_updated_at ON company_content;
CREATE TRIGGER update_company_content_updated_at 
    BEFORE UPDATE ON company_content 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_equipment_updated_at ON customer_equipment;
CREATE TRIGGER update_customer_equipment_updated_at 
    BEFORE UPDATE ON customer_equipment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for customer approval dashboard
CREATE OR REPLACE VIEW pending_customers_view AS
SELECT 
    c.id,
    c.account_number,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.state,
    c.service_preferences,
    c.created_at,
    COUNT(cl.id) as log_count
FROM customers c
LEFT JOIN customer_logs cl ON c.id = cl.customer_id
WHERE c.status = 'pending'
GROUP BY c.id, c.account_number, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.state, c.service_preferences, c.created_at
ORDER BY c.created_at DESC;

-- Create a view for inventory summary
CREATE OR REPLACE VIEW inventory_summary_view AS
SELECT 
    ii.id,
    ii.name,
    ii.category,
    ii.price,
    ii.stock_quantity,
    ii.min_stock_level,
    ii.status,
    CASE 
        WHEN ii.stock_quantity <= ii.min_stock_level THEN 'Low Stock'
        WHEN ii.stock_quantity = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
    END as stock_status,
    COALESCE(SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity ELSE 0 END), 0) as total_issued
FROM inventory_items ii
LEFT JOIN inventory_movements im ON ii.id = im.inventory_item_id
WHERE ii.status = 'active'
GROUP BY ii.id, ii.name, ii.category, ii.price, ii.stock_quantity, ii.min_stock_level, ii.status
ORDER BY ii.category, ii.name;

-- Grant necessary permissions (adjust as needed for your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Content management and customer approval database schema created successfully!';
    RAISE NOTICE 'Tables created: company_content, customer_equipment, customer_logs, inventory_items, inventory_movements';
    RAISE NOTICE 'Views created: pending_customers_view, inventory_summary_view';
    RAISE NOTICE 'Sample data inserted for content management and inventory items';
END $$;
