-- Create support_tickets table for customer support tracking
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(100),
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT
);

-- Create customer_feedback table for satisfaction tracking
CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    feedback_type VARCHAR(50) DEFAULT 'service' CHECK (feedback_type IN ('service', 'support', 'product', 'general')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_ticket_id ON customer_feedback(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

COMMENT ON TABLE support_tickets IS 'Customer support tickets and issue tracking';
COMMENT ON TABLE customer_feedback IS 'Customer satisfaction ratings and feedback';
