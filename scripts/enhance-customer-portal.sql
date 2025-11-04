-- Add portal-specific tables and enhancements

-- Add portal sessions table for better session management
CREATE TABLE IF NOT EXISTS portal_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Add customer notifications table
CREATE TABLE IF NOT EXISTS customer_notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Add service requests table for customer-initiated requests
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- upgrade, downgrade, additional, cancellation
    current_service_id INTEGER REFERENCES customer_services(id),
    requested_service_plan_id INTEGER REFERENCES service_plans(id),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by INTEGER,
    notes TEXT
);

-- Add payment reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- sms, email, portal
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent' -- sent, delivered, failed
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portal_sessions_customer_id ON portal_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread ON customer_notifications(customer_id, is_read);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_customer_id ON payment_reminders(customer_id);

-- Add triggers for automatic notifications
CREATE OR REPLACE FUNCTION notify_customer_payment_received()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_notifications (customer_id, title, message, type)
    VALUES (
        NEW.customer_id,
        'Payment Received',
        'Your payment of KES ' || NEW.amount || ' has been received and processed successfully.',
        'success'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_notification
    AFTER INSERT ON payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION notify_customer_payment_received();

-- Add function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_portal_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM portal_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to create payment reminders
CREATE OR REPLACE FUNCTION create_payment_reminders()
RETURNS INTEGER AS $$
DECLARE
    reminder_count INTEGER := 0;
    customer_record RECORD;
BEGIN
    -- Find customers with negative balances who haven't received reminders in the last 7 days
    FOR customer_record IN
        SELECT DISTINCT c.id, c.first_name, c.last_name, c.phone, c.email, c.balance
        FROM customers c
        WHERE c.balance < 0 
        AND c.status = 'active'
        AND NOT EXISTS (
            SELECT 1 FROM payment_reminders pr 
            WHERE pr.customer_id = c.id 
            AND pr.sent_at > NOW() - INTERVAL '7 days'
        )
    LOOP
        -- Create SMS reminder
        INSERT INTO payment_reminders (customer_id, amount, due_date, reminder_type)
        VALUES (
            customer_record.id,
            ABS(customer_record.balance),
            CURRENT_DATE + INTERVAL '3 days',
            'sms'
        );
        
        -- Create portal notification
        INSERT INTO customer_notifications (customer_id, title, message, type)
        VALUES (
            customer_record.id,
            'Payment Reminder',
            'Your account has an outstanding balance of KES ' || ABS(customer_record.balance) || '. Please make a payment to avoid service interruption.',
            'warning'
        );
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;
