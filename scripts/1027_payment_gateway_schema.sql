-- Payment Gateway and Wallet System Schema
-- Implements wallet-first architecture per payment gateway design

-- Payment gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- mpesa, airtel, card, bank
  is_active BOOLEAN DEFAULT true,
  config JSONB, -- API keys, credentials (encrypted)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table (immutable audit log)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  gateway VARCHAR(20) NOT NULL, -- mpesa, airtel, card, bank
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(5) DEFAULT 'KES',
  reference TEXT UNIQUE NOT NULL, -- Gateway transaction reference
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed, reversed
  raw_payload JSONB, -- Original gateway callback payload
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Customer wallets
CREATE TABLE IF NOT EXISTS customer_wallets (
  customer_id UUID PRIMARY KEY REFERENCES customers(id),
  balance NUMERIC(10,2) DEFAULT 0 NOT NULL,
  last_payment_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallet transactions (audit log for all wallet movements)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL, -- positive = credit, negative = debit
  transaction_type VARCHAR(30) NOT NULL, -- payment, allocation, refund, adjustment
  reference_id UUID, -- payment_id or service_id
  balance_before NUMERIC(10,2),
  balance_after NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer credit limits
CREATE TABLE IF NOT EXISTS customer_credit (
  customer_id UUID PRIMARY KEY REFERENCES customers(id),
  credit_limit NUMERIC(10,2) DEFAULT 0,
  credit_used NUMERIC(10,2) DEFAULT 0,
  credit_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Refunds table (negative payment entries)
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  refunded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_refund CHECK (amount > 0)
);

-- Service allocations (tracks which wallet funds went to which service)
CREATE TABLE IF NOT EXISTS service_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID NOT NULL REFERENCES customer_services(id),
  amount NUMERIC(10,2) NOT NULL,
  days_added INTEGER NOT NULL,
  allocation_type VARCHAR(20) DEFAULT 'automatic', -- automatic, manual
  allocated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment gateway logs (for debugging)
CREATE TABLE IF NOT EXISTS payment_gateway_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway VARCHAR(20),
  event_type VARCHAR(50),
  payload JSONB,
  response JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance (sub-5ms queries per rule 6)
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer ON wallet_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_allocations_service ON service_allocations(service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_allocations_customer ON service_allocations(customer_id, created_at DESC);

-- Initialize wallet for existing customers
INSERT INTO customer_wallets (customer_id, balance)
SELECT id, 0 FROM customers
WHERE id NOT IN (SELECT customer_id FROM customer_wallets)
ON CONFLICT (customer_id) DO NOTHING;
