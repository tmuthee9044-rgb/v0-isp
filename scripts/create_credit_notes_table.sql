-- Create credit_notes table to support finance documents functionality
CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_at ON credit_notes(created_at);

-- Add comments for documentation
COMMENT ON TABLE credit_notes IS 'Credit notes issued to customers for refunds, adjustments, or corrections';
COMMENT ON COLUMN credit_notes.credit_note_number IS 'Unique identifier for the credit note (e.g., CN-2024-001)';
COMMENT ON COLUMN credit_notes.invoice_id IS 'Optional reference to the original invoice being credited';
COMMENT ON COLUMN credit_notes.amount IS 'Credit amount (positive value)';
COMMENT ON COLUMN credit_notes.reason IS 'Reason for issuing the credit note';
COMMENT ON COLUMN credit_notes.status IS 'Status: draft, issued, applied, cancelled';
