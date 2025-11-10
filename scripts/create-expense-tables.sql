-- Create expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  budget_amount DECIMAL(12,2) DEFAULT 0,
  color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES expense_categories(id),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  vendor VARCHAR(255),
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'bank',
  status VARCHAR(50) DEFAULT 'paid',
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, budget_amount, color) VALUES
('Bandwidth & Connectivity', 'Internet bandwidth and connectivity costs', 160000, '#3b82f6'),
('Infrastructure & Equipment', 'Network equipment and infrastructure', 85000, '#10b981'),
('Personnel Costs', 'Staff salaries and benefits', 80000, '#8b5cf6'),
('Regulatory & Compliance', 'Licensing and regulatory fees', 32000, '#ef4444'),
('Marketing & Sales', 'Marketing campaigns and sales activities', 25000, '#f59e0b'),
('Other Operating Expenses', 'Miscellaneous operational costs', 12000, '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
