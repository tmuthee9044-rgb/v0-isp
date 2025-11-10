-- Create MPESA transactions table for comprehensive logging
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- STK Push fields
    checkout_request_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    
    -- C2B fields
    transaction_id VARCHAR(255),
    transaction_type VARCHAR(50),
    third_party_trans_id VARCHAR(255),
    
    -- Common fields
    transaction_time VARCHAR(50),
    transaction_date VARCHAR(50),
    amount DECIMAL(10,2),
    phone_number VARCHAR(20),
    business_short_code VARCHAR(20),
    bill_ref_number VARCHAR(255),
    invoice_number VARCHAR(255),
    org_account_balance DECIMAL(15,2),
    
    -- Customer details
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Status and results
    result_code INTEGER DEFAULT 0,
    result_desc TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    
    -- Raw callback data
    callback_data JSONB,
    
    -- Indexes for performance
    UNIQUE(checkout_request_id),
    UNIQUE(transaction_id),
    INDEX(mpesa_receipt_number),
    INDEX(phone_number),
    INDEX(status),
    INDEX(created_at),
    INDEX(amount)
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mpesa_transactions_updated_at 
    BEFORE UPDATE ON mpesa_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
