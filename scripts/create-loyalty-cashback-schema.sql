-- Create Loyalty & Cashback Database Schema
-- This script adds loyalty points and cashback functionality to the ISP system

-- Add loyalty_points column to existing customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0 NOT NULL;

-- Made foreign key references more flexible to handle missing tables
-- Create loyalty_transactions table to track point earnings and redemptions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL, -- Positive for earning, negative for redemption
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
    source_type VARCHAR(50) NOT NULL, -- 'topup', 'payment', 'bonus', 'manual', 'discount_redemption', 'credit_redemption'
    source_id INTEGER, -- Reference to payment_id, invoice_id, etc.
    description TEXT NOT NULL,
    metadata JSONB, -- Additional data like bonus percentage, campaign info
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- Removed foreign key constraint to users table
    expires_at TIMESTAMP WITHOUT TIME ZONE -- For point expiry (optional)
);

-- Create wallet_bonus_rules table for configuring cashback campaigns
CREATE TABLE IF NOT EXISTS wallet_bonus_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    topup_min_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (bonus_percentage >= 0 AND bonus_percentage <= 100),
    bonus_fixed_amount NUMERIC(10,2) DEFAULT 0, -- Alternative to percentage
    points_awarded INTEGER DEFAULT 0, -- Points awarded for this rule
    points_per_amount NUMERIC(10,2) DEFAULT 1, -- Points per currency unit (e.g., 1 point per 100 KES)
    max_bonus_amount NUMERIC(10,2), -- Cap on bonus amount
    max_uses_per_customer INTEGER, -- Limit uses per customer
    valid_from TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    target_customer_type VARCHAR(50), -- 'all', 'new', 'existing', 'premium'
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- Removed foreign key constraint to users table
);

-- Create wallet_transactions table to track all wallet activities
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('topup', 'deduction', 'bonus', 'refund', 'adjustment')),
    source_type VARCHAR(50), -- 'payment', 'bonus_rule', 'loyalty_redemption', 'manual', 'service_payment'
    source_id INTEGER, -- Reference to payment_id, bonus_rule_id, etc.
    description TEXT NOT NULL,
    balance_before NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL,
    reference_number VARCHAR(100),
    metadata JSONB, -- Campaign info, bonus details, etc.
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER -- Removed foreign key constraint to users table
);

-- Create wallet_balances table to track current wallet balances
CREATE TABLE IF NOT EXISTS wallet_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    current_balance NUMERIC(10,2) DEFAULT 0 NOT NULL,
    total_topups NUMERIC(10,2) DEFAULT 0 NOT NULL,
    total_bonuses NUMERIC(10,2) DEFAULT 0 NOT NULL,
    total_spent NUMERIC(10,2) DEFAULT 0 NOT NULL,
    last_topup_date TIMESTAMP WITHOUT TIME ZONE,
    last_transaction_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Made foreign key references optional to handle missing tables
-- Create loyalty_redemptions table to track point redemptions
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points_redeemed INTEGER NOT NULL,
    redemption_type VARCHAR(50) NOT NULL, -- 'wallet_credit', 'service_discount', 'bandwidth_days'
    redemption_value NUMERIC(10,2), -- Value in currency or days
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    description TEXT,
    applied_to_invoice INTEGER, -- Removed foreign key constraint to invoices table
    applied_to_service INTEGER, -- Removed foreign key constraint to customer_services table
    wallet_credit_amount NUMERIC(10,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    processed_by INTEGER -- Removed foreign key constraint to users table
);

-- Create bonus_campaigns table for marketing campaigns
CREATE TABLE IF NOT EXISTS bonus_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- 'topup_bonus', 'loyalty_multiplier', 'referral'
    description TEXT,
    bonus_rules JSONB NOT NULL, -- Flexible rules configuration
    target_audience JSONB, -- Customer criteria
    start_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    total_bonus_awarded NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- Removed foreign key constraint to users table
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_id ON wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_customer_id ON wallet_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_bonus_campaigns_active ON bonus_campaigns(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer_id ON loyalty_redemptions(customer_id);

-- Made default rule insertion more resilient
-- Insert default wallet bonus rules
INSERT INTO wallet_bonus_rules (rule_name, topup_min_amount, bonus_percentage, points_per_amount, description, created_by)
VALUES 
    ('Welcome Bonus', 500.00, 10.00, 1.00, 'New customer welcome bonus - 10% on first topup of 500 KES or more', 1),
    ('Standard Loyalty', 100.00, 0.00, 1.00, 'Standard loyalty points - 1 point per 100 KES topup', 1),
    ('Premium Topup Bonus', 1000.00, 5.00, 2.00, 'Premium bonus - 5% cashback + double points on 1000 KES+ topups', 1)
ON CONFLICT DO NOTHING;

-- Create trigger to update wallet balance timestamps
CREATE OR REPLACE FUNCTION update_wallet_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance_timestamp
    BEFORE UPDATE ON wallet_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance_timestamp();

-- Create function to calculate loyalty points for amount
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    customer_id_param INTEGER,
    amount_param NUMERIC,
    source_type_param VARCHAR DEFAULT 'topup'
) RETURNS INTEGER AS $$
DECLARE
    points_earned INTEGER := 0;
    applicable_rule RECORD;
BEGIN
    -- Find the best applicable bonus rule for this customer and amount
    SELECT * INTO applicable_rule
    FROM wallet_bonus_rules
    WHERE is_active = true
        AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
        AND topup_min_amount <= amount_param
        AND (target_customer_type IS NULL OR target_customer_type = 'all')
    ORDER BY points_per_amount DESC, bonus_percentage DESC
    LIMIT 1;
    
    IF applicable_rule.id IS NOT NULL THEN
        points_earned := FLOOR(amount_param / 100 * applicable_rule.points_per_amount);
    ELSE
        -- Default: 1 point per 100 currency units
        points_earned := FLOOR(amount_param / 100);
    END IF;
    
    RETURN GREATEST(points_earned, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate bonus amount
CREATE OR REPLACE FUNCTION calculate_bonus_amount(
    customer_id_param INTEGER,
    topup_amount_param NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    bonus_amount NUMERIC := 0;
    applicable_rule RECORD;
BEGIN
    -- Find the best applicable bonus rule
    SELECT * INTO applicable_rule
    FROM wallet_bonus_rules
    WHERE is_active = true
        AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
        AND topup_min_amount <= topup_amount_param
        AND bonus_percentage > 0
        AND (target_customer_type IS NULL OR target_customer_type = 'all')
    ORDER BY bonus_percentage DESC
    LIMIT 1;
    
    IF applicable_rule.id IS NOT NULL THEN
        IF applicable_rule.bonus_fixed_amount > 0 THEN
            bonus_amount := applicable_rule.bonus_fixed_amount;
        ELSE
            bonus_amount := topup_amount_param * (applicable_rule.bonus_percentage / 100);
        END IF;
        
        -- Apply maximum bonus cap if set
        IF applicable_rule.max_bonus_amount IS NOT NULL THEN
            bonus_amount := LEAST(bonus_amount, applicable_rule.max_bonus_amount);
        END IF;
    END IF;
    
    RETURN bonus_amount;
END;
$$ LANGUAGE plpgsql;

-- Made wallet balance initialization more resilient by not referencing potentially missing balance column
-- Initialize wallet balances for existing customers
INSERT INTO wallet_balances (customer_id, current_balance)
SELECT id, 0
FROM customers
WHERE id NOT IN (SELECT customer_id FROM wallet_balances WHERE customer_id IS NOT NULL)
ON CONFLICT (customer_id) DO NOTHING;

COMMENT ON TABLE loyalty_transactions IS 'Tracks all loyalty point transactions (earning and redemption)';
COMMENT ON TABLE wallet_bonus_rules IS 'Configuration for cashback and bonus campaigns';
COMMENT ON TABLE wallet_transactions IS 'All wallet-related financial transactions';
COMMENT ON TABLE wallet_balances IS 'Current wallet balance summary for each customer';
COMMENT ON TABLE loyalty_redemptions IS 'Tracks loyalty point redemptions and their applications';
COMMENT ON TABLE bonus_campaigns IS 'Marketing campaigns for bonuses and promotions';
