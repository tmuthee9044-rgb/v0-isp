-- Create comprehensive payment system tables

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'issued',
    pdf_path TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    service_id UUID,
    invoice_id UUID,
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL, -- 'service', 'invoice', 'credit'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment gateway logs
CREATE TABLE IF NOT EXISTS payment_gateway_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    gateway_name VARCHAR(50) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) NOT NULL,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service activation logs
CREATE TABLE IF NOT EXISTS service_activation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_id UUID,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    activation_type VARCHAR(50) NOT NULL, -- 'new', 'reactivation', 'upgrade'
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    activation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_payment_id ON payment_gateway_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processing_status ON webhook_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_service_activation_logs_customer_id ON service_activation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_activation_logs_payment_id ON service_activation_logs(payment_id);
