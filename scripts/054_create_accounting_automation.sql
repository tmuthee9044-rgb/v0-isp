-- Create automatic journal entry posting triggers and views for Balance Sheet and Trial Balance
-- This script sets up double-entry bookkeeping automation

-- ============================================
-- PART 1: Create database views for performance
-- ============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS trial_balance_view CASCADE;
DROP VIEW IF EXISTS balance_sheet_view CASCADE;

-- Trial Balance View
CREATE OR REPLACE VIEW trial_balance_view AS
SELECT 
  coa.id as account_id,
  coa.account_code,
  coa.account_name,
  coa.account_type,
  COALESCE(SUM(jel.debit_amount), 0) as debit_total,
  COALESCE(SUM(jel.credit_amount), 0) as credit_total,
  COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE coa.is_active = true AND (je.status = 'posted' OR je.status IS NULL)
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
ORDER BY coa.account_code;

-- Balance Sheet View
CREATE OR REPLACE VIEW balance_sheet_view AS
SELECT 
  COALESCE(SUM(CASE WHEN coa.account_type = 'Asset' THEN 
    COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0) 
  END), 0) as assets_total,
  COALESCE(SUM(CASE WHEN coa.account_type = 'Liability' THEN 
    COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)
  END), 0) as liabilities_total,
  COALESCE(SUM(CASE WHEN coa.account_type = 'Equity' THEN 
    COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)
  END), 0) as equity_total,
  COALESCE(SUM(CASE WHEN coa.account_type = 'Revenue' THEN 
    COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)
  END), 0) as revenue_total,
  COALESCE(SUM(CASE WHEN coa.account_type = 'Expense' THEN 
    COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)
  END), 0) as expense_total
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE coa.is_active = true AND (je.status = 'posted' OR je.status IS NULL);

-- ============================================
-- PART 2: Create trigger functions for auto-posting
-- ============================================

-- Function to get or create account by name
CREATE OR REPLACE FUNCTION get_account_id(account_name_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  account_id_result INTEGER;
BEGIN
  SELECT id INTO account_id_result
  FROM chart_of_accounts
  WHERE account_name = account_name_param
  LIMIT 1;
  
  RETURN account_id_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for invoice creation
CREATE OR REPLACE FUNCTION auto_post_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  accounts_receivable_id INTEGER;
  revenue_id INTEGER;
  entry_id INTEGER;
BEGIN
  -- Get account IDs
  accounts_receivable_id := get_account_id('Accounts Receivable');
  revenue_id := get_account_id('Internet Services Revenue');
  
  IF accounts_receivable_id IS NULL OR revenue_id IS NULL THEN
    RAISE NOTICE 'Required accounts not found for invoice journal entry';
    RETURN NEW;
  END IF;
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    'INV-' || NEW.id,
    NEW.created_at,
    'Invoice #' || NEW.invoice_number || ' for customer ' || NEW.customer_id,
    NEW.total_amount,
    NEW.total_amount,
    'posted',
    'invoice',
    NEW.id,
    NEW.created_by
  ) RETURNING id INTO entry_id;
  
  -- Debit: Accounts Receivable
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    accounts_receivable_id,
    1,
    NEW.total_amount,
    0,
    'Accounts Receivable - Invoice #' || NEW.invoice_number
  );
  
  -- Credit: Revenue
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    revenue_id,
    2,
    0,
    NEW.total_amount,
    'Revenue - Invoice #' || NEW.invoice_number
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for payment creation
CREATE OR REPLACE FUNCTION auto_post_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  cash_id INTEGER;
  accounts_receivable_id INTEGER;
  entry_id INTEGER;
BEGIN
  -- Get account IDs
  cash_id := get_account_id('Cash');
  accounts_receivable_id := get_account_id('Accounts Receivable');
  
  IF cash_id IS NULL OR accounts_receivable_id IS NULL THEN
    RAISE NOTICE 'Required accounts not found for payment journal entry';
    RETURN NEW;
  END IF;
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    'PAY-' || NEW.id,
    NEW.payment_date,
    'Payment received from customer ' || NEW.customer_id,
    NEW.amount,
    NEW.amount,
    'posted',
    'payment',
    NEW.id,
    1
  ) RETURNING id INTO entry_id;
  
  -- Debit: Cash
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    cash_id,
    1,
    NEW.amount,
    0,
    'Cash received - Payment #' || NEW.id
  );
  
  -- Credit: Accounts Receivable
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    accounts_receivable_id,
    2,
    0,
    NEW.amount,
    'Accounts Receivable - Payment #' || NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for expense creation
CREATE OR REPLACE FUNCTION auto_post_expense_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  expense_account_id INTEGER;
  cash_id INTEGER;
  entry_id INTEGER;
  expense_account_name TEXT;
BEGIN
  -- Get cash account
  cash_id := get_account_id('Cash');
  
  -- Determine expense account based on category
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO expense_account_name
    FROM expense_categories
    WHERE id = NEW.category_id;
    
    -- Try to find matching expense account
    SELECT id INTO expense_account_id
    FROM chart_of_accounts
    WHERE account_name ILIKE '%' || expense_account_name || '%'
      AND account_type = 'Expense'
    LIMIT 1;
  END IF;
  
  -- Default to general expense account if not found
  IF expense_account_id IS NULL THEN
    expense_account_id := get_account_id('Operating Expenses');
  END IF;
  
  IF expense_account_id IS NULL OR cash_id IS NULL THEN
    RAISE NOTICE 'Required accounts not found for expense journal entry';
    RETURN NEW;
  END IF;
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    'EXP-' || NEW.id,
    NEW.expense_date,
    'Expense: ' || NEW.description,
    NEW.amount,
    NEW.amount,
    'posted',
    'expense',
    NEW.id,
    NEW.created_by
  ) RETURNING id INTO entry_id;
  
  -- Debit: Expense Account
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    expense_account_id,
    1,
    NEW.amount,
    0,
    'Expense - ' || NEW.description
  );
  
  -- Credit: Cash
  INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    entry_id,
    cash_id,
    2,
    0,
    NEW.amount,
    'Cash paid - Expense #' || NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: Create triggers
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_auto_post_invoice ON invoices;
DROP TRIGGER IF EXISTS trigger_auto_post_payment ON payments;
DROP TRIGGER IF EXISTS trigger_auto_post_expense ON expenses;

-- Create triggers
CREATE TRIGGER trigger_auto_post_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_invoice_journal_entry();

CREATE TRIGGER trigger_auto_post_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_payment_journal_entry();

CREATE TRIGGER trigger_auto_post_expense
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_expense_journal_entry();

-- ============================================
-- PART 4: Grant permissions
-- ============================================

GRANT SELECT ON trial_balance_view TO PUBLIC;
GRANT SELECT ON balance_sheet_view TO PUBLIC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Accounting automation setup complete!';
  RAISE NOTICE '- Created trial_balance_view and balance_sheet_view';
  RAISE NOTICE '- Created automatic journal entry posting triggers';
  RAISE NOTICE '- All future invoices, payments, and expenses will auto-post to the general ledger';
END $$;
