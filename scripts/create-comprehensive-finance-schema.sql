-- Create comprehensive financial database schema for ISP management system

-- Revenue tracking tables
CREATE TABLE IF NOT EXISTS revenue_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_streams (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES revenue_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced expense tracking (building on existing expenses table)
CREATE TABLE IF NOT EXISTS expense_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget_allocation DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax management tables
CREATE TABLE IF NOT EXISTS tax_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_returns (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES tax_periods(id),
    return_type VARCHAR(50) NOT NULL,
    total_revenue DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    taxable_income DECIMAL(15,2),
    tax_due DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'draft',
    filed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget planning (enhanced from existing budgets table)
CREATE TABLE IF NOT EXISTS budget_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(100) NOT NULL,
    budget_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_line_items (
    id SERIAL PRIMARY KEY,
    version_id INTEGER REFERENCES budget_versions(id),
    category_id INTEGER REFERENCES expense_categories(id),
    subcategory_id INTEGER REFERENCES expense_subcategories(id),
    line_item_name VARCHAR(200) NOT NULL,
    budgeted_amount DECIMAL(12,2) NOT NULL,
    quarter_1 DECIMAL(12,2),
    quarter_2 DECIMAL(12,2),
    quarter_3 DECIMAL(12,2),
    quarter_4 DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- General ledger accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    parent_account_id INTEGER REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- invoice, payment, expense, etc.
    reference_id INTEGER,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'posted',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    line_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash flow tracking
CREATE TABLE IF NOT EXISTS cash_flow_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) NOT NULL, -- Operating, Investing, Financing
    is_inflow BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_flow_transactions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES cash_flow_categories(id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    bank_account VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial reporting tables
CREATE TABLE IF NOT EXISTS financial_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description) VALUES
-- Assets
('1000', 'Current Assets', 'Asset', 'Short-term assets'),
('1100', 'Cash and Cash Equivalents', 'Asset', 'Cash accounts'),
('1110', 'Petty Cash', 'Asset', 'Small cash fund'),
('1120', 'Bank Account - Operating', 'Asset', 'Main operating account'),
('1200', 'Accounts Receivable', 'Asset', 'Customer receivables'),
('1300', 'Inventory', 'Asset', 'Equipment and supplies'),
('1400', 'Prepaid Expenses', 'Asset', 'Prepaid items'),

-- Fixed Assets
('1500', 'Fixed Assets', 'Asset', 'Long-term assets'),
('1510', 'Network Equipment', 'Asset', 'Routers, switches, etc.'),
('1520', 'Office Equipment', 'Asset', 'Computers, furniture'),
('1530', 'Vehicles', 'Asset', 'Company vehicles'),

-- Liabilities
('2000', 'Current Liabilities', 'Liability', 'Short-term obligations'),
('2100', 'Accounts Payable', 'Liability', 'Supplier payables'),
('2200', 'Accrued Expenses', 'Liability', 'Accrued costs'),
('2300', 'Customer Deposits', 'Liability', 'Advance payments'),

-- Equity
('3000', 'Owner Equity', 'Equity', 'Owner investment'),
('3100', 'Retained Earnings', 'Equity', 'Accumulated profits'),

-- Revenue
('4000', 'Operating Revenue', 'Revenue', 'Main business income'),
('4100', 'Internet Service Revenue', 'Revenue', 'Monthly service fees'),
('4200', 'Installation Revenue', 'Revenue', 'Setup fees'),
('4300', 'Equipment Revenue', 'Revenue', 'Equipment sales'),

-- Expenses
('5000', 'Operating Expenses', 'Expense', 'Business operating costs'),
('5100', 'Bandwidth Costs', 'Expense', 'Internet connectivity'),
('5200', 'Staff Salaries', 'Expense', 'Employee compensation'),
('5300', 'Office Rent', 'Expense', 'Facility costs'),
('5400', 'Utilities', 'Expense', 'Power, water, etc.'),
('5500', 'Marketing', 'Expense', 'Advertising and promotion'),
('5600', 'Equipment Maintenance', 'Expense', 'Repair and maintenance')

ON CONFLICT (account_code) DO NOTHING;

-- Insert default revenue categories
INSERT INTO revenue_categories (name, description) VALUES
('Service Revenue', 'Monthly internet service fees'),
('Installation Revenue', 'One-time setup and installation fees'),
('Equipment Sales', 'Router and equipment sales'),
('Late Fees', 'Penalty charges for overdue payments'),
('Other Revenue', 'Miscellaneous income')
ON CONFLICT DO NOTHING;

-- Insert default expense categories if they don't exist
INSERT INTO expense_categories (name, description, is_active) VALUES
('Bandwidth', 'Internet connectivity costs', true),
('Salaries', 'Employee compensation', true),
('Rent', 'Office and facility costs', true),
('Utilities', 'Power, water, internet', true),
('Marketing', 'Advertising and promotion', true),
('Equipment', 'Hardware purchases', true),
('Maintenance', 'Repair and upkeep', true),
('Insurance', 'Business insurance', true),
('Legal & Professional', 'Legal and accounting fees', true),
('Travel', 'Business travel expenses', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default cash flow categories
INSERT INTO cash_flow_categories (name, category_type, is_inflow) VALUES
('Customer Payments', 'Operating', true),
('Service Revenue', 'Operating', true),
('Salary Payments', 'Operating', false),
('Rent Payments', 'Operating', false),
('Utility Payments', 'Operating', false),
('Equipment Purchase', 'Investing', false),
('Equipment Sale', 'Investing', true),
('Loan Proceeds', 'Financing', true),
('Loan Payments', 'Financing', false),
('Owner Investment', 'Financing', true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_transactions_date ON cash_flow_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Create function to auto-generate journal entry numbers
CREATE OR REPLACE FUNCTION generate_journal_entry_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    entry_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 3) AS INTEGER)), 0) + 1
    INTO next_number
    FROM journal_entries
    WHERE entry_number LIKE 'JE%';
    
    entry_number := 'JE' || LPAD(next_number::TEXT, 6, '0');
    RETURN entry_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_revenue_categories_updated_at
    BEFORE UPDATE ON revenue_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
    BEFORE UPDATE ON budget_line_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
