-- Create invoice_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index on invoice_id for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_items_timestamp_trigger ON invoice_items;
CREATE TRIGGER update_invoice_items_timestamp_trigger
BEFORE UPDATE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_items_timestamp();
