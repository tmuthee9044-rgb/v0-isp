-- Creating the missing locations table that the locations API depends on
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Insert some sample locations
INSERT INTO locations (name, address, city, region, description, status) VALUES
('Main Office', '123 Business Street', 'Nairobi', 'Nairobi County', 'Primary business location', 'active'),
('Westlands Branch', '456 Westlands Road', 'Nairobi', 'Nairobi County', 'Westlands service area', 'active'),
('Mombasa Office', '789 Moi Avenue', 'Mombasa', 'Mombasa County', 'Coastal operations center', 'active'),
('Kisumu Branch', '321 Oginga Odinga Street', 'Kisumu', 'Kisumu County', 'Western region office', 'active'),
('Nakuru Office', '654 Kenyatta Avenue', 'Nakuru', 'Nakuru County', 'Rift Valley operations', 'active')
ON CONFLICT DO NOTHING;
