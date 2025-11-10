-- Create service inventory junction table for tracking equipment assignments
CREATE TABLE IF NOT EXISTS service_inventory (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES customer_services(id) ON DELETE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'returned', 'damaged', 'lost')),
    notes TEXT,
    UNIQUE(service_id, inventory_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_inventory_service ON service_inventory(service_id);
CREATE INDEX IF NOT EXISTS idx_service_inventory_inventory ON service_inventory(inventory_id);
CREATE INDEX IF NOT EXISTS idx_service_inventory_status ON service_inventory(status);
