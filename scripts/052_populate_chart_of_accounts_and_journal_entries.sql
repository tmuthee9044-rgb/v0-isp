-- Create Chart of Accounts with standard accounting structure
-- This script populates the chart of accounts and generates journal entries from existing transactions

-- First, clear existing data
TRUNCATE TABLE journal_entry_lines CASCADE;
TRUNCATE TABLE journal_entries CASCADE;
TRUNCATE TABLE chart_of_accounts CASCADE;

-- Populate Chart of Accounts
-- ASSETS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
('1000', 'Assets', 'asset', 'All Assets', true),
('1100', 'Current Assets', 'asset', 'Assets convertible to cash within one year', true),
('1110', 'Cash and Cash Equivalents', 'asset', 'Cash on hand and in banks', true),
('1120', 'Accounts Receivable', 'asset', 'Money owed by customers', true),
('1130', 'Inventory', 'asset', 'Equipment and supplies inventory', true),
('1200', 'Fixed Assets', 'asset', 'Long-term assets', true),
('1210', 'Network Equipment', 'asset', 'Routers, switches, and network devices', true),
('1220', 'Vehicles', 'asset', 'Company vehicles', true),
('1230', 'Office Equipment', 'asset', 'Computers, furniture, and office equipment', true);

-- LIABILITIES
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
('2000', 'Liabilities', 'liability', 'All Liabilities', true),
('2100', 'Current Liabilities', 'liability', 'Obligations due within one year', true),
('2110', 'Accounts Payable', 'liability', 'Money owed to suppliers', true),
('2120', 'Unearned Revenue', 'liability', 'Prepaid services not yet delivered', true),
('2130', 'Accrued Expenses', 'liability', 'Expenses incurred but not yet paid', true),
('2200', 'Long-term Liabilities', 'liability', 'Obligations due after one year', true),
('2210', 'Long-term Debt', 'liability', 'Loans and financing', true);

-- EQUITY
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
('3000', 'Equity', 'equity', 'Owner''s Equity', true),
('3100', 'Capital', 'equity', 'Owner''s investment', true),
('3200', 'Retained Earnings', 'equity', 'Accumulated profits', true),
('3300', 'Current Year Earnings', 'equity', 'Profit/Loss for current year', true);

-- REVENUE
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
('4000', 'Revenue', 'revenue', 'All Revenue', true),
('4100', 'Service Revenue', 'revenue', 'Revenue from internet services', true),
('4110', 'Subscription Revenue', 'revenue', 'Monthly recurring revenue', true),
('4120', 'Installation Fees', 'revenue', 'One-time installation charges', true),
('4130', 'Equipment Rental', 'revenue', 'Revenue from equipment rental', true),
('4200', 'Other Revenue', 'revenue', 'Miscellaneous revenue', true);

-- EXPENSES
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
('5000', 'Expenses', 'expense', 'All Expenses', true),
('5100', 'Operating Expenses', 'expense', 'Day-to-day operating costs', true),
('5110', 'Salaries and Wages', 'expense', 'Employee compensation', true),
('5120', 'Rent', 'expense', 'Office and facility rent', true),
('5130', 'Utilities', 'expense', 'Electricity, water, internet', true),
('5140', 'Maintenance', 'expense', 'Equipment and facility maintenance', true),
('5150', 'Fuel', 'expense', 'Vehicle fuel costs', true),
('5200', 'Administrative Expenses', 'expense', 'Administrative costs', true),
('5210', 'Office Supplies', 'expense', 'Stationery and office supplies', true),
('5220', 'Professional Fees', 'expense', 'Legal, accounting, consulting fees', true),
('5300', 'Marketing Expenses', 'expense', 'Marketing and advertising', true);

-- Generate Journal Entries from existing Payments
-- Entry 1: Record customer payments as cash receipts
INSERT INTO journal_entries (entry_number, entry_date, description, total_debit, total_credit, status, reference_type, reference_id, created_by)
SELECT 
  'JE-PAY-' || p.id,
  p.payment_date::date,
  'Customer payment - ' || COALESCE(c.first_name || ' ' || c.last_name, c.business_name),
  p.amount,
  p.amount,
  'posted',
  'payment',
  p.id,
  p.processed_by
FROM payments p
JOIN customers c ON p.customer_id = c.id
WHERE p.status = 'completed'
AND p.amount > 0
LIMIT 50;

-- Create journal entry lines for payments (Debit: Cash, Credit: Accounts Receivable)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1110'), -- Cash
  1,
  je.total_debit,
  0,
  'Cash received from customer'
FROM journal_entries je
WHERE je.reference_type = 'payment';

INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1120'), -- Accounts Receivable
  2,
  0,
  je.total_credit,
  'Payment applied to receivables'
FROM journal_entries je
WHERE je.reference_type = 'payment';

-- Generate Journal Entries from Invoices
-- Entry 2: Record invoices as revenue and receivables
INSERT INTO journal_entries (entry_number, entry_date, description, total_debit, total_credit, status, reference_type, reference_id, created_by)
SELECT 
  'JE-INV-' || i.id,
  i.invoice_date,
  'Invoice ' || i.invoice_number || ' - ' || COALESCE(c.first_name || ' ' || c.last_name, c.business_name),
  i.amount,
  i.amount,
  'posted',
  'invoice',
  i.id,
  1
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.amount > 0
LIMIT 50;

-- Create journal entry lines for invoices (Debit: Accounts Receivable, Credit: Revenue)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1120'), -- Accounts Receivable
  1,
  je.total_debit,
  0,
  'Invoice issued to customer'
FROM journal_entries je
WHERE je.reference_type = 'invoice';

INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '4110'), -- Subscription Revenue
  2,
  0,
  je.total_credit,
  'Service revenue recognized'
FROM journal_entries je
WHERE je.reference_type = 'invoice';

-- Generate Journal Entries from Expenses
-- Entry 3: Record expenses
INSERT INTO journal_entries (entry_number, entry_date, description, total_debit, total_credit, status, reference_type, reference_id, created_by)
SELECT 
  'JE-EXP-' || e.id,
  e.expense_date,
  'Expense - ' || COALESCE(e.description, e.vendor),
  e.amount,
  e.amount,
  'posted',
  'expense',
  e.id,
  e.approved_by
FROM expenses e
WHERE e.status = 'approved'
AND e.amount > 0
LIMIT 50;

-- Create journal entry lines for expenses (Debit: Expense Account, Credit: Cash/Accounts Payable)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '5100'), -- Operating Expenses
  1,
  je.total_debit,
  0,
  'Expense incurred'
FROM journal_entries je
WHERE je.reference_type = 'expense';

INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
SELECT 
  je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1110'), -- Cash
  2,
  0,
  je.total_credit,
  'Cash paid for expense'
FROM journal_entries je
WHERE je.reference_type = 'expense';

-- Add opening balance entry to balance the books
INSERT INTO journal_entries (entry_number, entry_date, description, total_debit, total_credit, status, reference_type, created_by)
VALUES ('JE-OPEN-001', '2025-01-01', 'Opening Balance', 500000, 500000, 'posted', 'opening_balance', 1);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, debit_amount, credit_amount, description)
VALUES 
  ((SELECT id FROM journal_entries WHERE entry_number = 'JE-OPEN-001'), 
   (SELECT id FROM chart_of_accounts WHERE account_code = '1110'), -- Cash
   1, 500000, 0, 'Opening cash balance'),
  ((SELECT id FROM journal_entries WHERE entry_number = 'JE-OPEN-001'),
   (SELECT id FROM chart_of_accounts WHERE account_code = '3100'), -- Capital
   2, 0, 500000, 'Owner''s capital contribution');

-- Verify the data
SELECT 'Chart of Accounts created: ' || COUNT(*) || ' accounts' FROM chart_of_accounts;
SELECT 'Journal Entries created: ' || COUNT(*) || ' entries' FROM journal_entries;
SELECT 'Journal Entry Lines created: ' || COUNT(*) || ' lines' FROM journal_entry_lines;

-- Show trial balance summary
SELECT 
  coa.account_code,
  coa.account_name,
  coa.account_type,
  COALESCE(SUM(jel.debit_amount), 0) as total_debit,
  COALESCE(SUM(jel.credit_amount), 0) as total_credit,
  COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.status = 'posted' OR je.status IS NULL
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
ORDER BY coa.account_code;
