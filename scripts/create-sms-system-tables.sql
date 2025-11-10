-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
    message_id VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_sms_logs_recipient (recipient),
    INDEX idx_sms_logs_status (status),
    INDEX idx_sms_logs_created (created_at),
    INDEX idx_sms_logs_provider (provider)
);

-- Insert default SMS configuration
INSERT INTO system_config (key, value, created_at) VALUES
('sms_provider', 'mock', NOW()),
('sms_api_key', '', NOW()),
('sms_sender_id', 'ISP Support', NOW()),
('sms_active', 'true', NOW())
ON CONFLICT (key) DO NOTHING;

-- Create SMS templates for common notifications
INSERT INTO message_templates (name, template_type, subject, content, variables, is_active, created_at) VALUES
('ticket_assignment', 'sms', 'Ticket Assignment', 'New support ticket assigned: {{ticket_number}}
Priority: {{priority}}
Subject: {{subject}}
Please check your dashboard for details.', 
'{"ticket_number": "string", "priority": "string", "subject": "string"}', 
true, NOW()),

('ticket_escalation', 'sms', 'Ticket Escalation', 'URGENT: Ticket {{ticket_number}} has been escalated to you.
Customer: {{customer_name}}
Issue: {{subject}}
Please respond immediately.', 
'{"ticket_number": "string", "customer_name": "string", "subject": "string"}', 
true, NOW()),

('ticket_reminder', 'sms', 'Ticket Reminder', 'Reminder: Ticket {{ticket_number}} is still pending.
Assigned {{hours_ago}} hours ago.
Priority: {{priority}}
Please update status.', 
'{"ticket_number": "string", "hours_ago": "number", "priority": "string"}', 
true, NOW())
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE sms_logs IS 'Logs all SMS messages sent by the system';
COMMENT ON COLUMN sms_logs.recipient IS 'Phone number that received the SMS';
COMMENT ON COLUMN sms_logs.status IS 'Delivery status: sent, failed, pending';
COMMENT ON COLUMN sms_logs.message_id IS 'Provider-specific message ID for tracking';
