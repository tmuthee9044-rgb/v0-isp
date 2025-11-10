-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  budgeted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  budget_year INTEGER NOT NULL,
  budget_period VARCHAR(50) DEFAULT 'annual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default budget categories for current year
INSERT INTO budgets (category, budgeted_amount, actual_amount, budget_year, budget_period) VALUES
('Revenue', 900000, 892847, EXTRACT(YEAR FROM CURRENT_DATE), 'annual'),
('Bandwidth Costs', 160000, 156000, EXTRACT(YEAR FROM CURRENT_DATE), 'annual'),
('Infrastructure', 85000, 89500, EXTRACT(YEAR FROM CURRENT_DATE), 'annual'),
('Personnel', 80000, 78200, EXTRACT(YEAR FROM CURRENT_DATE), 'annual'),
('Marketing', 25000, 19934, EXTRACT(YEAR FROM CURRENT_DATE), 'annual'),
('Other Expenses', 50000, 45600, EXTRACT(YEAR FROM CURRENT_DATE), 'annual')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(budget_year);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(budget_period);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();
