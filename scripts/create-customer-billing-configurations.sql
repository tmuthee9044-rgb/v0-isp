-- Create customer billing configurations table for per-customer billing rules
CREATE TABLE IF NOT EXISTS customer_billing_configurations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Billing Cycle Configuration
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, semi-annual, annual
    billing_day INTEGER DEFAULT 1, -- Day of month/week for billing (1-31 for monthly, 1-7 for weekly)
    pro_rata_enabled BOOLEAN DEFAULT true, -- Enable pro-rata billing for mid-cycle changes
    
    -- Tax Configuration
    tax_inclusive BOOLEAN DEFAULT false, -- Whether prices include tax
    tax_rate NUMERIC(5,2) DEFAULT 0.00, -- Custom tax rate for this customer
    tax_exempt BOOLEAN DEFAULT false, -- Tax exemption status
    
    -- Payment Terms
    payment_terms INTEGER DEFAULT 30, -- Days to pay invoice
    grace_period_days INTEGER DEFAULT 7, -- Grace period before late fees
    late_fee_type VARCHAR(20) DEFAULT 'percentage', -- percentage or fixed
    late_fee_amount NUMERIC(10,2) DEFAULT 0.00, -- Late fee amount or percentage
    
    -- Credit Management
    credit_limit NUMERIC(12,2) DEFAULT 0.00, -- Customer credit limit
    auto_suspend_on_overdue BOOLEAN DEFAULT true, -- Auto suspend when overdue
    overdue_threshold_days INTEGER DEFAULT 30, -- Days overdue before suspension
    
    -- Automation Settings
    auto_generate_invoices BOOLEAN DEFAULT true, -- Auto generate recurring invoices
    auto_send_invoices BOOLEAN DEFAULT true, -- Auto send invoices via email/SMS
    auto_send_reminders BOOLEAN DEFAULT true, -- Auto send payment reminders
    reminder_days_before INTEGER DEFAULT 3, -- Days before due date to send reminder
    reminder_days_after INTEGER DEFAULT 7, -- Days after due date to send reminder
    
    -- Notification Preferences
    notification_email VARCHAR(255), -- Override email for billing notifications
    notification_phone VARCHAR(20), -- Override phone for billing notifications
    notification_methods JSONB DEFAULT '["email"]', -- email, sms, both
    
    -- Custom Settings
    custom_invoice_template VARCHAR(100), -- Custom invoice template
    custom_payment_terms TEXT, -- Custom payment terms text
    billing_notes TEXT, -- Internal billing notes
    
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    UNIQUE(customer_id),
    CHECK (billing_cycle IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual')),
    CHECK (billing_day >= 1 AND billing_day <= 31),
    CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CHECK (late_fee_type IN ('percentage', 'fixed')),
    CHECK (credit_limit >= 0),
    CHECK (payment_terms > 0),
    CHECK (grace_period_days >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_billing_configurations_customer_id ON customer_billing_configurations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_billing_configurations_billing_cycle ON customer_billing_configurations(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_customer_billing_configurations_auto_generate ON customer_billing_configurations(auto_generate_invoices);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_billing_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_billing_configurations_updated_at
    BEFORE UPDATE ON customer_billing_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_billing_configurations_updated_at();

-- Insert default configurations for existing customers
INSERT INTO customer_billing_configurations (customer_id, created_by)
SELECT id, 1 FROM customers 
WHERE id NOT IN (SELECT customer_id FROM customer_billing_configurations WHERE customer_id IS NOT NULL)
ON CONFLICT (customer_id) DO NOTHING;
