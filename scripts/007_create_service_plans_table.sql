-- Create service_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'residential',
    speed_down INTEGER NOT NULL,
    speed_up INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    data_limit INTEGER, -- in GB, null for unlimited
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    installation_fee DECIMAL(10,2) DEFAULT 0.00,
    equipment_fee DECIMAL(10,2) DEFAULT 0.00,
    fup_limit INTEGER, -- Fair Usage Policy limit in GB
    fup_speed VARCHAR(50), -- Speed after FUP limit
    contract_period INTEGER DEFAULT 12, -- months
    early_termination_fee DECIMAL(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_plans_active ON service_plans(active);
CREATE INDEX IF NOT EXISTS idx_service_plans_category ON service_plans(category);
CREATE INDEX IF NOT EXISTS idx_service_plans_price ON service_plans(price);

-- Insert sample service plans
INSERT INTO service_plans (name, description, category, speed_down, speed_up, price, fup_limit, fup_speed, setup_fee, installation_fee, equipment_fee) VALUES
('Basic Home', 'Perfect for light browsing and email', 'residential', 10, 5, 2999.00, 50, '2/1 Mbps', 500.00, 1000.00, 2500.00),
('Standard Home', 'Great for streaming and working from home', 'residential', 25, 10, 4999.00, 100, '5/2 Mbps', 500.00, 1500.00, 3500.00),
('Premium Home', 'Ideal for heavy usage and gaming', 'residential', 50, 25, 7999.00, 200, '10/5 Mbps', 0.00, 2000.00, 5000.00),
('Business Starter', 'Enterprise-grade connectivity for small business', 'business', 100, 50, 14999.00, NULL, NULL, 0.00, 3000.00, 8000.00),
('Enterprise Pro', 'Maximum performance for large enterprises', 'enterprise', 500, 250, 49999.00, NULL, NULL, 0.00, 5000.00, 15000.00)
ON CONFLICT (id) DO NOTHING;
