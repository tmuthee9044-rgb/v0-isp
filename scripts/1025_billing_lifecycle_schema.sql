-- Add billing lifecycle columns to customer_services
ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS service_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS service_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES network_devices(id);

-- Add billing fields to service_plans
ALTER TABLE service_plans
ADD COLUMN IF NOT EXISTS billing_cycle_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN DEFAULT false;

-- Add billing fields to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES customer_services(id),
ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create service_events table for audit trail
CREATE TABLE IF NOT EXISTS service_events (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_events_service_id ON service_events(service_id);
CREATE INDEX IF NOT EXISTS idx_service_events_created_at ON service_events(created_at DESC);

-- Create index on service_end for fast suspension queries
CREATE INDEX IF NOT EXISTS idx_customer_services_service_end ON customer_services(service_end) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_services_active_status ON customer_services(is_active, is_suspended, is_deleted, service_end);

-- Create notifications table
CREATE TABLE IF NOT EXISTS service_notifications (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_notifications_scheduled ON service_notifications(scheduled_for) WHERE status = 'pending';
