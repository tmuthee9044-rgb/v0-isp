-- Enhanced Customer Management Tables

-- Create customer categories
CREATE TABLE IF NOT EXISTS customer_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Enhance existing customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES customer_categories(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;

-- Create customer addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'billing', 'service', 'mailing'
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    coordinates POINT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'phone', 'email', 'whatsapp'
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer notes table
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    note TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- 'general', 'technical', 'billing', 'complaint'
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default customer categories
INSERT INTO customer_categories (tenant_id, name, description, discount_percentage) VALUES
('00000000-0000-0000-0000-000000000001', 'Residential', 'Individual home users', 0),
('00000000-0000-0000-0000-000000000001', 'Business', 'Small and medium businesses', 5),
('00000000-0000-0000-0000-000000000001', 'Corporate', 'Large corporate clients', 10),
('00000000-0000-0000-0000-000000000001', 'Government', 'Government institutions', 15),
('00000000-0000-0000-0000-000000000001', 'Educational', 'Schools and universities', 20)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_category_id ON customers(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
