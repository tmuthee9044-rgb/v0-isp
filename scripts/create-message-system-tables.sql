-- Creating comprehensive message system database tables
-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create messages table for tracking sent messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    template_id INTEGER REFERENCES message_templates(id),
    campaign_id INTEGER,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'bounced')),
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    opened_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create message campaigns table
CREATE TABLE IF NOT EXISTS message_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms', 'mixed')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    template_id INTEGER REFERENCES message_templates(id),
    target_criteria JSONB DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create communication settings table
CREATE TABLE IF NOT EXISTS communication_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'notification'
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(setting_type, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_template_id ON messages(template_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(active);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_campaigns_updated_at BEFORE UPDATE ON message_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_settings_updated_at BEFORE UPDATE ON communication_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default message templates
INSERT INTO message_templates (name, type, category, subject, content, variables) VALUES
('Welcome Email', 'email', 'onboarding', 'Welcome to TrustWaves Network!', 
 'Dear {{customer_name}},

Welcome to TrustWaves Network! Your internet service has been successfully activated.

Service Plan: {{service_plan}}
Speed: {{speed}}
Monthly Fee: KES {{monthly_fee}}

For support, contact us at support@trustwaves.com or call +254700000000.

Best regards,
TrustWaves Network Team', 
 '["customer_name", "service_plan", "speed", "monthly_fee"]'::jsonb),

('Payment Reminder SMS', 'sms', 'billing', NULL,
 'Hi {{customer_name}}, your monthly bill of KES {{amount}} is due on {{due_date}}. Pay via M-Pesa: Paybill 123456, Account: {{account_number}}. TrustWaves Network',
 '["customer_name", "amount", "due_date", "account_number"]'::jsonb),

('Service Interruption Notice', 'email', 'maintenance', 'Scheduled Maintenance - {{maintenance_date}}',
 'Dear {{customer_name}},

We will be performing scheduled maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.

During this time, you may experience temporary service interruptions.

We apologize for any inconvenience.

TrustWaves Network Team',
 '["customer_name", "maintenance_date", "start_time", "end_time"]'::jsonb),

('Overdue Payment Alert', 'sms', 'billing', NULL,
 'URGENT: {{customer_name}}, your account is overdue by KES {{overdue_amount}}. Service may be suspended. Pay now via M-Pesa: Paybill 123456, Account: {{account_number}}. TrustWaves',
 '["customer_name", "overdue_amount", "account_number"]'::jsonb);

-- Insert default communication settings
INSERT INTO communication_settings (setting_type, setting_key, setting_value) VALUES
('email', 'smtp_host', 'smtp.gmail.com'),
('email', 'smtp_port', '587'),
('email', 'smtp_username', 'noreply@trustwaves.com'),
('email', 'smtp_password', '', true),
('email', 'from_name', 'TrustWaves Network'),
('email', 'from_email', 'noreply@trustwaves.com'),
('email', 'reply_to', 'support@trustwaves.com'),
('email', 'encryption', 'tls'),
('email', 'html_enabled', 'true'),
('email', 'tracking_enabled', 'false'),
('email', 'auto_retry', 'true'),
('email', 'queue_enabled', 'true'),
('email', 'max_retries', '3'),
('email', 'retry_delay', '5'),
('email', 'batch_size', '50'),
('sms', 'provider', 'africastalking'),
('sms', 'username', 'your_username'),
('sms', 'api_key', '', true),
('sms', 'sender_id', 'TRUSTWAVES'),
('sms', 'endpoint', 'https://api.africastalking.com/version1/messaging'),
('sms', 'delivery_reports', 'true'),
('sms', 'unicode_support', 'false'),
('sms', 'auto_retry', 'true'),
('sms', 'queue_enabled', 'true'),
('sms', 'max_retries', '3'),
('sms', 'retry_delay', '2'),
('sms', 'batch_size', '100'),
('sms', 'cost_per_message', '2.50'),
('sms', 'daily_limit', '1000'),
('sms', 'budget_alerts', 'true');
