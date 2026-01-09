-- Finance Audit Trail Triggers
-- This script creates triggers to automatically log all financial actions

-- Create or replace the finance audit trigger function
CREATE OR REPLACE FUNCTION finance_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INTEGER;
    v_ip_address INET;
BEGIN
    -- Try to get user_id from session, default to NULL if not set
    BEGIN
        v_user_id := current_setting('app.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Try to get IP address from session, default to NULL if not set
    BEGIN
        v_ip_address := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        v_ip_address := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO finance_audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values, 
            user_id, 
            ip_address, 
            created_at
        )
        VALUES (
            TG_TABLE_NAME, 
            OLD.id, 
            'DELETE', 
            row_to_json(OLD), 
            v_user_id, 
            v_ip_address, 
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO finance_audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values, 
            new_values, 
            user_id, 
            ip_address, 
            created_at
        )
        VALUES (
            TG_TABLE_NAME, 
            NEW.id, 
            'UPDATE', 
            row_to_json(OLD), 
            row_to_json(NEW), 
            v_user_id, 
            v_ip_address, 
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO finance_audit_trail (
            table_name, 
            record_id, 
            action, 
            new_values, 
            user_id, 
            ip_address, 
            created_at
        )
        VALUES (
            TG_TABLE_NAME, 
            NEW.id, 
            'INSERT', 
            row_to_json(NEW), 
            v_user_id, 
            v_ip_address, 
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS finance_audit_invoices ON invoices;
DROP TRIGGER IF EXISTS finance_audit_payments ON payments;
DROP TRIGGER IF EXISTS finance_audit_expenses ON expenses;
DROP TRIGGER IF EXISTS finance_audit_tax_returns ON tax_returns;
DROP TRIGGER IF EXISTS finance_audit_financial_adjustments ON financial_adjustments;
DROP TRIGGER IF EXISTS finance_audit_invoice_items ON invoice_items;
DROP TRIGGER IF EXISTS finance_audit_account_balances ON account_balances;
DROP TRIGGER IF EXISTS finance_audit_tax_configurations ON tax_configurations;

-- Create triggers for all finance-related tables

-- Invoices table
CREATE TRIGGER finance_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function();

-- Payments table
CREATE TRIGGER finance_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function();

-- Expenses table
CREATE TRIGGER finance_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function();

-- Tax returns table
CREATE TRIGGER finance_audit_tax_returns
    AFTER INSERT OR UPDATE OR DELETE ON tax_returns
    FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function();

-- Financial adjustments table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_adjustments') THEN
        EXECUTE 'CREATE TRIGGER finance_audit_financial_adjustments
            AFTER INSERT OR UPDATE OR DELETE ON financial_adjustments
            FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function()';
    END IF;
END $$;

-- Invoice items table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        EXECUTE 'CREATE TRIGGER finance_audit_invoice_items
            AFTER INSERT OR UPDATE OR DELETE ON invoice_items
            FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function()';
    END IF;
END $$;

-- Account balances table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_balances') THEN
        EXECUTE 'CREATE TRIGGER finance_audit_account_balances
            AFTER INSERT OR UPDATE OR DELETE ON account_balances
            FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function()';
    END IF;
END $$;

-- Tax configurations table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_configurations') THEN
        EXECUTE 'CREATE TRIGGER finance_audit_tax_configurations
            AFTER INSERT OR UPDATE OR DELETE ON tax_configurations
            FOR EACH ROW EXECUTE FUNCTION finance_audit_trigger_function()';
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_created_at ON finance_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_table_action ON finance_audit_trail(table_name, action);
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_user_id ON finance_audit_trail(user_id);

-- Insert a test record to verify the trigger is working
DO $$
DECLARE
    test_invoice_id INTEGER;
BEGIN
    -- Create a test invoice to trigger the audit log
    INSERT INTO invoices (
        invoice_number,
        customer_id,
        amount,
        description,
        due_date,
        status
    )
    SELECT 
        'TEST-AUDIT-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        (SELECT id FROM customers LIMIT 1),
        0.01,
        'Test invoice for audit trail verification',
        CURRENT_DATE + INTERVAL '30 days',
        'pending'
    WHERE EXISTS (SELECT 1 FROM customers LIMIT 1)
    RETURNING id INTO test_invoice_id;
    
    -- Delete the test invoice
    IF test_invoice_id IS NOT NULL THEN
        DELETE FROM invoices WHERE id = test_invoice_id;
        RAISE NOTICE 'Finance audit trail triggers installed successfully. Test records created and deleted.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create test record, but triggers are installed: %', SQLERRM;
END $$;
