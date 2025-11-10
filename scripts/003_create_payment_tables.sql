-- Payment and Billing Tables
-- This script creates comprehensive payment processing tables

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- mpesa, airtel_money, bank_transfer, cash, card
    provider VARCHAR(100), -- safaricom, airtel, equity_bank, etc.
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    processing_fee_percent DECIMAL(5,4) DEFAULT 0,
    processing_fee_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Payments
CREATE TABLE IF NOT EXISTS enhanced_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES enhanced_customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(15,2) NOT NULL,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled, refunded
    payment_date TIMESTAMP WITH TIME ZONE,
    reference_number VARCHAR(100),
    external_transaction_id VARCHAR(100),
    gateway_response JSONB,
    failure_reason TEXT,
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES enhanced_payments(id) ON DELETE CASCADE,
    bank_statement_reference VARCHAR(100),
    reconciliation_date DATE NOT NULL,
    reconciled_by UUID REFERENCES enhanced_users(id),
    variance_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- M-Pesa Transactions (Kenya specific)
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES enhanced_payments(id),
    transaction_type VARCHAR(50), -- C2B, B2C, B2B
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    conversation_id VARCHAR(100),
    originator_conversation_id VARCHAR(100),
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    phone_number VARCHAR(15),
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    result_code INTEGER,
    result_desc TEXT,
    mpesa_receipt_number VARCHAR(100),
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Airtel Money Transactions (Kenya specific)
CREATE TABLE IF NOT EXISTS airtel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES enhanced_payments(id),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    reference_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    phone_number VARCHAR(15),
    status VARCHAR(50),
    status_code VARCHAR(10),
    status_message TEXT,
    airtel_money_id VARCHAR(100),
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_payments_customer ON enhanced_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_payments_invoice ON enhanced_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_payments_status ON enhanced_payments(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_payments_date ON enhanced_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_payment ON mpesa_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_airtel_transactions_payment ON airtel_transactions(payment_id);

-- Insert default payment methods
INSERT INTO payment_methods (tenant_id, name, type, provider, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'M-Pesa', 'mpesa', 'safaricom', true),
('00000000-0000-0000-0000-000000000001', 'Airtel Money', 'airtel_money', 'airtel', true),
('00000000-0000-0000-0000-000000000001', 'Bank Transfer', 'bank_transfer', 'generic', true),
('00000000-0000-0000-0000-000000000001', 'Cash Payment', 'cash', 'manual', true)
ON CONFLICT DO NOTHING;
