-- Complete Wallet-Based Billing System
-- Per enterprise payment gateway design document

-- Taxes configuration table
CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  rate NUMERIC(5,2) NOT NULL, -- 16.00 for VAT
  is_inclusive BOOLEAN DEFAULT false,
  tax_type VARCHAR(50), -- VAT, LEVY, EXCISE
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plan taxes mapping
CREATE TABLE IF NOT EXISTS plan_taxes (
  plan_id INTEGER REFERENCES service_plans(id),
  tax_id UUID REFERENCES taxes(id),
  PRIMARY KEY (plan_id, tax_id)
);

-- Enhanced invoices table with tax support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES customer_services(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP DEFAULT NOW();
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;

-- Notifications table for dunning
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES customer_services(id),
  channel VARCHAR(10) NOT NULL, -- sms, email
  template VARCHAR(100),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue aggregation table (for performance)
CREATE TABLE IF NOT EXISTS revenue_daily (
  date DATE PRIMARY KEY,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  active_services INTEGER DEFAULT 0,
  suspended_services INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor VARCHAR(255),
  action VARCHAR(100),
  entity VARCHAR(100),
  entity_id TEXT,
  changes JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service notifications for dunning
CREATE TABLE IF NOT EXISTS service_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES customer_services(id),
  notification_type VARCHAR(50), -- expiry_warning_5days, expiry_warning_2days, suspended, final_notice
  scheduled_for TIMESTAMP NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(service_id, notification_type, scheduled_for)
);

-- Service events table (already exists, adding index)
CREATE INDEX IF NOT EXISTS idx_service_events_service ON service_events(service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_events_type ON service_events(event_type);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_service ON invoices(service_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_service_notifications_scheduled ON service_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor, created_at DESC);

-- Insert default VAT tax
INSERT INTO taxes (name, rate, is_inclusive, tax_type)
VALUES ('VAT (16%)', 16.00, false, 'VAT')
ON CONFLICT DO NOTHING;

-- Function to automatically update revenue_daily
CREATE OR REPLACE FUNCTION update_revenue_daily()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revenue_daily (date, total_revenue, payment_count)
  VALUES (CURRENT_DATE, NEW.amount, 1)
  ON CONFLICT (date) DO UPDATE
  SET total_revenue = revenue_daily.total_revenue + NEW.amount,
      payment_count = revenue_daily.payment_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update revenue on payment
CREATE TRIGGER payment_revenue_update
AFTER INSERT ON payments
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION update_revenue_daily();
