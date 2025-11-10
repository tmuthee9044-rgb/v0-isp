-- Create loyalty notifications table
CREATE TABLE IF NOT EXISTS loyalty_notifications (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('points_earned', 'bonus_credited', 'points_redeemed', 'campaign_started', 'points_expiring')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'in_app', 'loyalty')),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loyalty campaigns table for notifications
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_amount DECIMAL(10,2) NOT NULL,
    bonus_percentage DECIMAL(5,2) NOT NULL,
    points_awarded INTEGER NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    target_customers TEXT DEFAULT 'all', -- Simplified from array to simple text field
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customers table if they don't exist
DO $$ 
BEGIN
    -- Add loyalty_points column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loyalty_points') THEN
        ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
        ALTER TABLE customers ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
        ALTER TABLE customers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Create loyalty_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem')),
    description TEXT,
    reference_id VARCHAR(50),
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loyalty_notifications_customer_id ON loyalty_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_notifications_type ON loyalty_notifications(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_notifications_read ON loyalty_notifications(read);
CREATE INDEX IF NOT EXISTS idx_loyalty_notifications_created_at ON loyalty_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer_id ON notification_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_active ON loyalty_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_valid_dates ON loyalty_campaigns(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(type);

-- Simplified campaign notification function without complex error handling
CREATE OR REPLACE FUNCTION send_campaign_notifications()
RETURNS VOID AS $$
DECLARE
    campaign RECORD;
BEGIN
    -- Get active campaigns that haven't sent notifications yet
    FOR campaign IN 
        SELECT * FROM loyalty_campaigns 
        WHERE is_active = true 
        AND notification_sent = false 
        AND valid_from <= CURRENT_TIMESTAMP 
        AND valid_until > CURRENT_TIMESTAMP
    LOOP
        -- Send notifications to all active customers
        INSERT INTO loyalty_notifications (
            customer_id, type, title, message, data
        )
        SELECT 
            c.id,
            'campaign_started',
            'New Bonus Campaign!',
            'Exciting news! ' || campaign.name || ': Top up KES ' || campaign.min_amount || ' or more and get ' || campaign.bonus_percentage || '% cashback + ' || campaign.points_awarded || ' loyalty points!',
            jsonb_build_object(
                'campaign_id', campaign.id,
                'campaign_name', campaign.name,
                'min_amount', campaign.min_amount,
                'bonus_percentage', campaign.bonus_percentage,
                'points_awarded', campaign.points_awarded,
                'valid_until', campaign.valid_until
            )
        FROM customers c
        WHERE c.status = 'active' OR c.status IS NULL;
        
        -- Mark campaign as notification sent
        UPDATE loyalty_campaigns 
        SET notification_sent = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = campaign.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Simplified expiring points check function
CREATE OR REPLACE FUNCTION check_expiring_points()
RETURNS VOID AS $$
BEGIN
    -- Insert expiring points notifications for customers with points
    INSERT INTO loyalty_notifications (
        customer_id, type, title, message, data
    )
    SELECT 
        c.id,
        'points_expiring',
        'Points Expiring Soon!',
        'Reminder: Some of your loyalty points are expiring in 7 days. Redeem them before they expire!',
        jsonb_build_object(
            'expiry_date', (CURRENT_DATE + INTERVAL '7 days')::date
        )
    FROM customers c
    WHERE c.loyalty_points > 0 
    AND (c.status = 'active' OR c.status IS NULL);
END;
$$ LANGUAGE plpgsql;
