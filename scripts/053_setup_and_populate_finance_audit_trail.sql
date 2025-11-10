-- Setup Finance Audit Trail with Triggers and Historical Data
-- This script creates the audit triggers and backfills historical data

-- First, ensure the finance_audit_trail table exists
CREATE TABLE IF NOT EXISTS finance_audit_trail (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_created_at ON finance_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_table_name ON finance_audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_action_type ON finance_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_user_id ON finance_audit_trail(user_id);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_invoices_changes ON invoices;
DROP TRIGGER IF EXISTS audit_payments_changes ON payments;
DROP TRIGGER IF EXISTS audit_expenses_changes ON expenses;
DROP TRIGGER IF EXISTS audit_tax_returns_changes ON tax_returns;
DROP TRIGGER IF EXISTS audit_financial_adjustments_changes ON financial_adjustments;

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS log_finance_audit_trail() CASCADE;

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION log_finance_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO finance_audit_trail (
            action_type,
            table_name,
            record_id,
            old_values,
            new_values,
            user_id,
            created_at,
            description
        ) VALUES (
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(),
            'Record deleted from ' || TG_TABLE_NAME
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO finance_audit_trail (
            action_type,
            table_name,
            record_id,
            old_values,
            new_values,
            user_id,
            created_at,
            description
        ) VALUES (
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(),
            'Record updated in ' || TG_TABLE_NAME
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO finance_audit_trail (
            action_type,
            table_name,
            record_id,
            old_values,
            new_values,
            user_id,
            created_at,
            description
        ) VALUES (
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(),
            'Record created in ' || TG_TABLE_NAME
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all finance tables
CREATE TRIGGER audit_invoices_changes
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_finance_audit_trail();

CREATE TRIGGER audit_payments_changes
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_finance_audit_trail();

CREATE TRIGGER audit_expenses_changes
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_finance_audit_trail();

CREATE TRIGGER audit_tax_returns_changes
    AFTER INSERT OR UPDATE OR DELETE ON tax_returns
    FOR EACH ROW EXECUTE FUNCTION log_finance_audit_trail();

CREATE TRIGGER audit_financial_adjustments_changes
    AFTER INSERT OR UPDATE OR DELETE ON financial_adjustments
    FOR EACH ROW EXECUTE FUNCTION log_finance_audit_trail();

-- Backfill historical audit data from existing invoices
INSERT INTO finance_audit_trail (
    action_type,
    table_name,
    record_id,
    new_values,
    user_id,
    created_at,
    description
)
SELECT 
    'INSERT',
    'invoices',
    id,
    jsonb_build_object(
        'id', id,
        'customer_id', customer_id,
        'invoice_number', invoice_number,
        'amount', amount,
        'status', status,
        'due_date', due_date
    ),
    1,
    created_at,
    'Invoice #' || invoice_number || ' created for customer ' || customer_id
FROM invoices
WHERE NOT EXISTS (
    SELECT 1 FROM finance_audit_trail 
    WHERE table_name = 'invoices' 
    AND record_id = invoices.id 
    AND action_type = 'INSERT'
);

-- Backfill historical audit data from existing payments
INSERT INTO finance_audit_trail (
    action_type,
    table_name,
    record_id,
    new_values,
    user_id,
    created_at,
    description
)
SELECT 
    'INSERT',
    'payments',
    id,
    jsonb_build_object(
        'id', id,
        'customer_id', customer_id,
        'amount', amount,
        'payment_method', payment_method,
        'status', status,
        'transaction_id', transaction_id
    ),
    1,
    created_at,
    'Payment of ' || amount || ' received via ' || payment_method
FROM payments
WHERE NOT EXISTS (
    SELECT 1 FROM finance_audit_trail 
    WHERE table_name = 'payments' 
    AND record_id = payments.id 
    AND action_type = 'INSERT'
);

-- Backfill historical audit data from existing expenses
INSERT INTO finance_audit_trail (
    action_type,
    table_name,
    record_id,
    new_values,
    user_id,
    created_at,
    description
)
SELECT 
    'INSERT',
    'expenses',
    id,
    jsonb_build_object(
        'id', id,
        'category_id', category_id,
        'amount', amount,
        'description', description,
        'status', status
    ),
    1,
    created_at,
    'Expense of ' || amount || ' recorded'
FROM expenses
WHERE NOT EXISTS (
    SELECT 1 FROM finance_audit_trail 
    WHERE table_name = 'expenses' 
    AND record_id = expenses.id 
    AND action_type = 'INSERT'
);

-- Add some sample audit entries for demonstration
INSERT INTO finance_audit_trail (
    action_type,
    table_name,
    record_id,
    description,
    user_id,
    created_at
) VALUES
    ('SYSTEM', 'finance_audit_trail', NULL, 'Finance audit trail system initialized', 1, NOW() - INTERVAL '30 days'),
    ('SYSTEM', 'finance_audit_trail', NULL, 'Audit triggers activated for all finance tables', 1, NOW() - INTERVAL '29 days');

-- Display summary
SELECT 
    table_name,
    action_type,
    COUNT(*) as count
FROM finance_audit_trail
GROUP BY table_name, action_type
ORDER BY table_name, action_type;
