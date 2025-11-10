-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message campaigns table
CREATE TABLE IF NOT EXISTS message_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms', 'mixed')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    template_id INTEGER REFERENCES message_templates(id),
    target_criteria JSONB,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    template_id INTEGER REFERENCES message_templates(id),
    campaign_id INTEGER REFERENCES message_campaigns(id),
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    external_id VARCHAR(255), -- For tracking with external services
    cost DECIMAL(10,4), -- Cost per message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message delivery logs table
CREATE TABLE IF NOT EXISTS message_delivery_logs (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, failed
    event_data JSONB,
    external_id VARCHAR(255),
    webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message unsubscribes table
CREATE TABLE IF NOT EXISTS message_unsubscribes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    email VARCHAR(255),
    phone VARCHAR(20),
    type VARCHAR(10) CHECK (type IN ('email', 'sms', 'all')),
    reason TEXT,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message attachments table (for emails)
CREATE TABLE IF NOT EXISTS message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    file_size INTEGER,
    file_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message analytics table
CREATE TABLE IF NOT EXISTS message_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_template_id ON messages(template_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_message_delivery_logs_message_id ON message_delivery_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_message_delivery_logs_event_type ON message_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_campaigns_status ON message_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_message_unsubscribes_customer_id ON message_unsubscribes(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_date ON message_analytics(date);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_campaigns_updated_at BEFORE UPDATE ON message_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample message templates
INSERT INTO message_templates (name, type, category, subject, content, variables) VALUES
('Welcome Email', 'email', 'onboarding', 'Welcome to TrustWaves Network!', 
 'Dear {{customer_name}},

Welcome to TrustWaves Network! Your internet service has been successfully activated.

Service Details:
- Plan: {{service_plan}}
- Speed: {{speed}}
- Monthly Fee: KES {{monthly_fee}}
- Installation Date: {{installation_date}}

Your account number is {{account_number}}. Please keep this for your records.

For technical support, contact us at:
- Email: support@trustwaves.com
- Phone: +254700000000
- WhatsApp: +254700000000

Thank you for choosing TrustWaves Network!

Best regards,
TrustWaves Network Team', 
 '["customer_name", "service_plan", "speed", "monthly_fee", "installation_date", "account_number"]'),

('Payment Reminder SMS', 'sms', 'billing', NULL,
 'Hi {{customer_name}}, your monthly bill of KES {{amount}} is due on {{due_date}}. Pay via M-Pesa: Paybill 123456, Account: {{account_number}}. TrustWaves Network',
 '["customer_name", "amount", "due_date", "account_number"]'),

('Service Interruption Notice', 'email', 'maintenance', 'Scheduled Maintenance - {{maintenance_date}}',
 'Dear {{customer_name}},

We will be performing scheduled maintenance on our network infrastructure on {{maintenance_date}} from {{start_time}} to {{end_time}}.

During this time, you may experience temporary service interruptions in the following areas:
{{affected_areas}}

We apologize for any inconvenience this may cause and appreciate your patience as we work to improve our services.

If you have any questions, please contact our support team at support@trustwaves.com or +254700000000.

Best regards,
TrustWaves Network Team',
 '["customer_name", "maintenance_date", "start_time", "end_time", "affected_areas"]'),

('Overdue Payment Alert', 'sms', 'billing', NULL,
 'URGENT: {{customer_name}}, your account is overdue by KES {{overdue_amount}}. Service may be suspended on {{suspension_date}}. Pay now via M-Pesa: Paybill 123456, Account: {{account_number}}. TrustWaves',
 '["customer_name", "overdue_amount", "suspension_date", "account_number"]'),

('Speed Upgrade Offer', 'email', 'promotional', 'Upgrade Your Internet Speed - Special Offer!',
 'Dear {{customer_name}},

Great news! We''re offering you an exclusive opportunity to upgrade your internet speed.

Current Plan: {{current_plan}} - {{current_speed}}
Upgrade to: {{upgrade_plan}} - {{upgrade_speed}}

Special Offer Price: KES {{offer_price}} (Regular: KES {{regular_price}})
Offer Valid Until: {{offer_expiry}}

Benefits of upgrading:
- Faster downloads and streaming
- Better video call quality
- Improved online gaming experience
- No installation fees

To upgrade, reply to this email or call us at +254700000000.

Best regards,
TrustWaves Network Team',
 '["customer_name", "current_plan", "current_speed", "upgrade_plan", "upgrade_speed", "offer_price", "regular_price", "offer_expiry"]'),

('Technical Support Follow-up', 'email', 'support', 'Technical Support Follow-up - Ticket #{{ticket_number}}',
 'Dear {{customer_name}},

We hope this email finds you well. We''re following up on the technical support ticket #{{ticket_number}} that was resolved on {{resolution_date}}.

Issue: {{issue_description}}
Resolution: {{resolution_summary}}

We want to ensure that everything is working perfectly for you. If you''re still experiencing any issues or have additional questions, please don''t hesitate to contact us.

Your satisfaction is our priority, and we''re here to help 24/7.

Rate our support: {{feedback_link}}

Best regards,
TrustWaves Technical Support Team',
 '["customer_name", "ticket_number", "resolution_date", "issue_description", "resolution_summary", "feedback_link"]'),

('Service Suspension Notice', 'sms', 'billing', NULL,
 'NOTICE: {{customer_name}}, your service has been suspended due to non-payment. Outstanding: KES {{outstanding_amount}}. Pay via M-Pesa: Paybill 123456, Account: {{account_number}} to restore service. TrustWaves',
 '["customer_name", "outstanding_amount", "account_number"]'),

('Data Usage Alert', 'sms', 'support', NULL,
 'Hi {{customer_name}}, you have used {{usage_percentage}}% of your monthly data allowance ({{used_gb}}GB of {{total_gb}}GB). Consider upgrading your plan. TrustWaves Network',
 '["customer_name", "usage_percentage", "used_gb", "total_gb"]');

-- Create a view for message statistics
CREATE OR REPLACE VIEW message_stats AS
SELECT 
    DATE(created_at) as date,
    type,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    ROUND(
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(CASE WHEN status IN ('sent', 'delivered', 'failed') THEN 1 END), 0)) * 100, 
        2
    ) as delivery_rate
FROM messages 
GROUP BY DATE(created_at), type
ORDER BY date DESC, type;

-- Create a view for template usage statistics
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
    mt.id,
    mt.name,
    mt.type,
    mt.category,
    mt.usage_count,
    COUNT(m.id) as actual_usage,
    COALESCE(AVG(CASE WHEN m.status = 'delivered' THEN 1.0 ELSE 0.0 END) * 100, 0) as delivery_rate,
    MAX(m.created_at) as last_used
FROM message_templates mt
LEFT JOIN messages m ON mt.id = m.template_id
GROUP BY mt.id, mt.name, mt.type, mt.category, mt.usage_count
ORDER BY actual_usage DESC;
