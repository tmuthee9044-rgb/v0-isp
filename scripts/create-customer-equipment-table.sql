-- Create customer_equipment table to fix the missing table error
CREATE TABLE IF NOT EXISTS customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255),
    mac_address VARCHAR(17),
    ip_address INET,
    status VARCHAR(50) DEFAULT 'active',
    assigned_date DATE DEFAULT CURRENT_DATE,
    returned_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_status ON customer_equipment(status);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_mac_address ON customer_equipment(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_ip_address ON customer_equipment(ip_address);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_customer_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customer_equipment_updated_at ON customer_equipment;
CREATE TRIGGER trigger_customer_equipment_updated_at
    BEFORE UPDATE ON customer_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_equipment_updated_at();

-- Add comments
COMMENT ON TABLE customer_equipment IS 'Equipment assigned to customers';
COMMENT ON COLUMN customer_equipment.equipment_type IS 'Type of equipment (router, modem, etc.)';
COMMENT ON COLUMN customer_equipment.serial_number IS 'Equipment serial number';
COMMENT ON COLUMN customer_equipment.mac_address IS 'MAC address of the equipment';
COMMENT ON COLUMN customer_equipment.ip_address IS 'IP address assigned to equipment';
