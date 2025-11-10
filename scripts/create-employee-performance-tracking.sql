-- Create employee performance tracking table
CREATE TABLE IF NOT EXISTS employee_performance_tracking (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'assigned', 'in_progress', 'resolved', 'escalated'
    time_spent NUMERIC(5,2), -- Hours spent on the ticket
    items_used TEXT, -- Equipment/resources used
    resolution_notes TEXT, -- Notes about the resolution
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_performance_employee (employee_id),
    INDEX idx_performance_ticket (ticket_id),
    INDEX idx_performance_date (created_at),
    INDEX idx_performance_action (action_type)
);

-- Add resolved_at column to support_tickets if it doesn't exist
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20) UNIQUE;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'TKT-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample performance tracking data
INSERT INTO employee_performance_tracking (ticket_id, employee_id, action_type, time_spent, items_used, resolution_notes, customer_satisfaction)
SELECT 
    st.id,
    st.assigned_to,
    'resolved',
    ROUND((RANDOM() * 4 + 0.5)::NUMERIC, 2), -- Random time between 0.5-4.5 hours
    CASE 
        WHEN RANDOM() < 0.3 THEN 'Router replacement'
        WHEN RANDOM() < 0.6 THEN 'Cable repair kit'
        ELSE 'Remote configuration'
    END,
    'Issue resolved successfully',
    FLOOR(RANDOM() * 2 + 4)::INTEGER -- Rating between 4-5
FROM support_tickets st
WHERE st.assigned_to IS NOT NULL
AND st.status = 'resolved'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE employee_performance_tracking IS 'Tracks employee performance metrics for support ticket resolution';
COMMENT ON COLUMN employee_performance_tracking.time_spent IS 'Time spent in hours on the ticket';
COMMENT ON COLUMN employee_performance_tracking.items_used IS 'Equipment or resources used for resolution';
COMMENT ON COLUMN employee_performance_tracking.customer_satisfaction IS 'Customer satisfaction rating (1-5)';
