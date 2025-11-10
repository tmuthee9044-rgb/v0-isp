-- Finance Module Database Schema Migration
-- This script enhances existing tables and creates new ones for comprehensive finance management

-- Enhance invoices table with additional fields
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_period_start DATE,
ADD COLUMN IF NOT EXISTS service_period_end DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_prorated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create invoice_items table for detailed line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhance payments table with additional fields
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS processed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS gateway_response JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create financial_adjustments table for credits/debits
CREATE TABLE IF NOT EXISTS financial_adjustments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) CHECK (adjustment_type IN ('credit', 'debit')) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    reference_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- Create tax_configurations table
CREATE TABLE IF NOT EXISTS tax_configurations (
    id SERIAL PRIMARY KEY,
    tax_name VARCHAR(100) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- VAT, Withholding, etc.
    is_active BOOLEAN DEFAULT TRUE,
    applies_to VARCHAR(50) DEFAULT 'all', -- all, residential, business
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- mpesa, bank, card, cash
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create financial_reports table for cached reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    report_period VARCHAR(50) NOT NULL, -- monthly, quarterly, yearly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create account_balances table for customer balance tracking
CREATE TABLE IF NOT EXISTS account_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0,
    credit_limit NUMERIC(10,2) DEFAULT 0,
    last_payment_date DATE,
    last_invoice_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'suspended', 'closed')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);

-- Enhance expenses table with additional fields
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS project_id INTEGER,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20);

-- Create expense_approvals table for approval workflow
CREATE TABLE IF NOT EXISTS expense_approvals (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_templates table for automated reminders
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- payment_reminder, invoice_generated, etc.
    subject VARCHAR(200),
    content TEXT NOT NULL,
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_trail table for finance actions
CREATE TABLE IF NOT EXISTS finance_audit_trail (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tax configurations
INSERT INTO tax_configurations (tax_name, tax_rate, tax_type, applies_to) VALUES
('VAT', 16.00, 'VAT', 'all'),
('Withholding Tax', 5.00, 'Withholding', 'business')
ON CONFLICT DO NOTHING;

-- Insert default payment methods
INSERT INTO payment_methods (name, type, configuration) VALUES
('M-Pesa', 'mpesa', '{"provider": "safaricom", "shortcode": "174379"}'),
('Bank Transfer', 'bank', '{"account_number": "1234567890", "bank_name": "KCB"}'),
('Cash', 'cash', '{}'),
('Credit Card', 'card', '{"processor": "stripe"}')
ON CONFLICT DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (template_name, template_type, subject, content, variables) VALUES
('Payment Reminder - 5 Days', 'payment_reminder', 'Payment Reminder - Invoice Due in 5 Days', 
 'Dear {{customer_name}}, your invoice #{{invoice_number}} for {{amount}} is due on {{due_date}}. Please make payment to avoid service interruption.',
 '["customer_name", "invoice_number", "amount", "due_date"]'),
('Payment Reminder - Due Today', 'payment_reminder', 'Payment Due Today - Immediate Action Required',
 'Dear {{customer_name}}, your invoice #{{invoice_number}} for {{amount}} is due today. Please make payment immediately to avoid service suspension.',
 '["customer_name", "invoice_number", "amount", "due_date"]'),
('Payment Received', 'payment_confirmation', 'Payment Received - Thank You',
 'Dear {{customer_name}}, we have received your payment of {{amount}} for invoice #{{invoice_number}}. Thank you for your business.',
 '["customer_name", "invoice_number", "amount", "payment_date"]')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_account_balances_status ON account_balances(status);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_customer ON financial_adjustments(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_table_record ON finance_audit_trail(table_name, record_id);

-- Create triggers for automatic balance updates
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account balance when payments or invoices change
    INSERT INTO account_balances (customer_id, balance, updated_at)
    VALUES (
        COALESCE(NEW.customer_id, OLD.customer_id),
        (
            SELECT COALESCE(SUM(p.amount), 0) - COALESCE(SUM(i.amount), 0)
            FROM payments p
            FULL OUTER JOIN invoices i ON p.customer_id = i.customer_id
            WHERE COALESCE(p.customer_id, i.customer_id) = COALESCE(NEW.customer_id, OLD.customer_id)
        ),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (customer_id) 
    DO UPDATE SET 
        balance = EXCLUDED.balance,
        updated_at = EXCLUDED.updated_at;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_balance_on_payment ON payments;
CREATE TRIGGER trigger_update_balance_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

DROP TRIGGER IF EXISTS trigger_update_balance_on_invoice ON invoices;
CREATE TRIGGER trigger_update_balance_on_invoice
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- Initialize account balances for existing customers
INSERT INTO account_balances (customer_id, balance, updated_at)
SELECT 
    c.id,
    COALESCE(payments_sum.total, 0) - COALESCE(invoices_sum.total, 0) as balance,
    CURRENT_TIMESTAMP
FROM customers c
LEFT JOIN (
    SELECT customer_id, SUM(amount) as total
    FROM payments 
    WHERE status = 'completed'
    GROUP BY customer_id
) payments_sum ON c.id = payments_sum.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(amount) as total
    FROM invoices 
    WHERE status IN ('pending', 'overdue')
    GROUP BY customer_id
) invoices_sum ON c.id = invoices_sum.customer_id
ON CONFLICT (customer_id) DO NOTHING;
