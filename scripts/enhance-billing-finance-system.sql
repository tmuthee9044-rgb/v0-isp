-- Enhanced Billing and Finance System with Multi-Gateway Support

-- Enhanced payment gateway configurations
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(100) NOT NULL,
    gateway_type VARCHAR(50) NOT NULL, -- mpesa, stripe, flutterwave, paystack, bank_transfer
    provider VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_sandbox BOOLEAN DEFAULT FALSE,
    configuration JSONB DEFAULT '{}',
    api_key TEXT,
    secret_key TEXT,
    webhook_url TEXT,
    supported_currencies TEXT[] DEFAULT ARRAY['KES'],
    processing_fee_percent DECIMAL(5,4) DEFAULT 0,
    processing_fee_fixed DECIMAL(10,2) DEFAULT 0,
    daily_limit DECIMAL(15,2),
    monthly_limit DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_used VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP;

-- Payment refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    refund_reference VARCHAR(255),
    gateway_response JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT '30 days';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Recurring billing schedules
CREATE TABLE IF NOT EXISTS billing_schedules (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    billing_frequency VARCHAR(50) NOT NULL, -- monthly, quarterly, annually
    amount DECIMAL(15,2) NOT NULL,
    next_billing_date DATE NOT NULL,
    last_billed_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled
    auto_payment BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    bank_statement_reference VARCHAR(255),
    reconciliation_date DATE NOT NULL,
    reconciled_by INTEGER REFERENCES users(id),
    variance_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Financial reporting cache
CREATE TABLE IF NOT EXISTS financial_reports_cache (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

-- Dunning management for overdue payments
CREATE TABLE IF NOT EXISTS dunning_campaigns (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    campaign_type VARCHAR(50) NOT NULL, -- reminder, warning, final_notice, suspension
    days_overdue INTEGER NOT NULL,
    message_template TEXT,
    sent_at TIMESTAMP,
    delivery_method VARCHAR(50), -- email, sms, portal
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-currency support
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    is_base_currency BOOLEAN DEFAULT FALSE,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Exchange rates history
CREATE TABLE IF NOT EXISTS exchange_rates_history (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default gateway configurations
INSERT INTO payment_gateway_configs (gateway_name, gateway_type, provider, supported_currencies, processing_fee_percent, processing_fee_fixed) VALUES
('M-Pesa', 'mpesa', 'safaricom', ARRAY['KES'], 0.0, 0.0),
('Stripe', 'stripe', 'stripe', ARRAY['USD', 'EUR', 'KES'], 2.9, 30),
('Flutterwave', 'flutterwave', 'flutterwave', ARRAY['KES', 'USD', 'NGN', 'GHS'], 3.8, 0),
('Paystack', 'paystack', 'paystack', ARRAY['NGN', 'GHS', 'USD'], 1.5, 100),
('Bank Transfer', 'bank_transfer', 'manual', ARRAY['KES', 'USD'], 0.0, 0.0)
ON CONFLICT DO NOTHING;

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, is_base_currency) VALUES
('KES', 'Kenyan Shilling', 'KSh', TRUE),
('USD', 'US Dollar', '$', FALSE),
('EUR', 'Euro', '€', FALSE),
('GBP', 'British Pound', '£', FALSE)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_gateway_used ON payments(gateway_used);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON payments(reconciled);
CREATE INDEX IF NOT EXISTS idx_payments_external_transaction_id ON payments(external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_next_billing_date ON billing_schedules(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_customer_id ON billing_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_dunning_campaigns_customer_id ON dunning_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_cache_type_period ON financial_reports_cache(report_type, period_start, period_end);

-- Create triggers for automatic calculations
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate totals when invoice line items change
    UPDATE invoices SET
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        total_amount = subtotal + tax_amount - discount_amount,
        balance = total_amount - paid_amount
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Function to process recurring billing
CREATE OR REPLACE FUNCTION process_recurring_billing()
RETURNS INTEGER AS $$
DECLARE
    billing_record RECORD;
    invoice_id INTEGER;
    processed_count INTEGER := 0;
BEGIN
    FOR billing_record IN
        SELECT * FROM billing_schedules
        WHERE status = 'active'
        AND next_billing_date <= CURRENT_DATE
    LOOP
        -- Create invoice
        INSERT INTO invoices (
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            subtotal,
            total_amount,
            balance,
            status,
            description
        ) VALUES (
            billing_record.customer_id,
            'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoices_id_seq')::TEXT, 6, '0'),
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            billing_record.amount,
            billing_record.amount,
            billing_record.amount,
            'pending',
            'Recurring billing for service'
        ) RETURNING id INTO invoice_id;

        -- Add line item
        INSERT INTO invoice_line_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            line_total
        ) VALUES (
            invoice_id,
            'Monthly service fee',
            1,
            billing_record.amount,
            billing_record.amount
        );

        -- Update billing schedule
        UPDATE billing_schedules SET
            last_billed_date = CURRENT_DATE,
            next_billing_date = CASE billing_record.billing_frequency
                WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
                WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
                WHEN 'annually' THEN CURRENT_DATE + INTERVAL '1 year'
                ELSE CURRENT_DATE + INTERVAL '1 month'
            END,
            updated_at = NOW()
        WHERE id = billing_record.id;

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create dunning campaigns for overdue invoices
CREATE OR REPLACE FUNCTION create_dunning_campaigns()
RETURNS INTEGER AS $$
DECLARE
    overdue_invoice RECORD;
    campaign_count INTEGER := 0;
BEGIN
    FOR overdue_invoice IN
        SELECT i.*, c.first_name, c.last_name, c.email, c.phone,
               EXTRACT(days FROM NOW() - i.due_date)::INTEGER as days_overdue
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.status IN ('pending', 'overdue')
        AND i.due_date < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM dunning_campaigns dc
            WHERE dc.invoice_id = i.id
            AND dc.created_at > NOW() - INTERVAL '7 days'
        )
    LOOP
        -- Determine campaign type based on days overdue
        DECLARE
            campaign_type VARCHAR(50);
            message_template TEXT;
        BEGIN
            IF overdue_invoice.days_overdue <= 7 THEN
                campaign_type := 'reminder';
                message_template := 'Friendly reminder: Your invoice is now overdue.';
            ELSIF overdue_invoice.days_overdue <= 14 THEN
                campaign_type := 'warning';
                message_template := 'Warning: Your account is past due. Please pay immediately.';
            ELSIF overdue_invoice.days_overdue <= 30 THEN
                campaign_type := 'final_notice';
                message_template := 'Final notice: Your service may be suspended if payment is not received.';
            ELSE
                campaign_type := 'suspension';
                message_template := 'Your service has been suspended due to non-payment.';
            END IF;

            INSERT INTO dunning_campaigns (
                customer_id,
                invoice_id,
                campaign_type,
                days_overdue,
                message_template,
                delivery_method
            ) VALUES (
                overdue_invoice.customer_id,
                overdue_invoice.id,
                campaign_type,
                overdue_invoice.days_overdue,
                message_template,
                'email'
            );

            campaign_count := campaign_count + 1;
        END;
    END LOOP;

    RETURN campaign_count;
END;
$$ LANGUAGE plpgsql;
