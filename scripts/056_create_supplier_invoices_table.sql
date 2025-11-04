-- Create supplier_invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  payment_terms INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_po_id ON supplier_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON supplier_invoices(due_date);

-- Create supplier_invoice_items table
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice_id ON supplier_invoice_items(invoice_id);

-- Function to update invoice updated_at timestamp
CREATE OR REPLACE FUNCTION update_supplier_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_supplier_invoice_timestamp
BEFORE UPDATE ON supplier_invoices
FOR EACH ROW
EXECUTE FUNCTION update_supplier_invoice_timestamp();

-- Function to automatically update invoice status based on paid_amount
CREATE OR REPLACE FUNCTION update_supplier_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount THEN
    NEW.status = 'PAID';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status = 'PARTIALLY_PAID';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount = 0 THEN
    NEW.status = 'OVERDUE';
  ELSE
    NEW.status = 'UNPAID';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status
CREATE TRIGGER trigger_update_supplier_invoice_status
BEFORE INSERT OR UPDATE OF paid_amount, total_amount, due_date ON supplier_invoices
FOR EACH ROW
EXECUTE FUNCTION update_supplier_invoice_status();

COMMENT ON TABLE supplier_invoices IS 'Stores invoices from suppliers for received purchase orders';
COMMENT ON TABLE supplier_invoice_items IS 'Line items for supplier invoices';
