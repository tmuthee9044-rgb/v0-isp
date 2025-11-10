-- Fix customers table structure for ISP Management System
-- This script adds missing columns and indexes to support the application

BEGIN;

-- Add missing columns to customers table
DO $$ 
BEGIN
    -- Add customer_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='customer_type') THEN
        ALTER TABLE customers ADD COLUMN customer_type VARCHAR(50) DEFAULT 'individual';
    END IF;
    
    -- Add plan column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='plan') THEN
        ALTER TABLE customers ADD COLUMN plan VARCHAR(100) DEFAULT 'Basic Plan';
    END IF;
    
    -- Add monthly_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='monthly_fee') THEN
        ALTER TABLE customers ADD COLUMN monthly_fee DECIMAL(10,2) DEFAULT 2500.00;
    END IF;
    
    -- Add balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='balance') THEN
        ALTER TABLE customers ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add connection_quality column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='connection_quality') THEN
        ALTER TABLE customers ADD COLUMN connection_quality INTEGER DEFAULT 95;
    END IF;
    
    -- Add data_usage column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='data_usage') THEN
        ALTER TABLE customers ADD COLUMN data_usage VARCHAR(50) DEFAULT '0 GB';
    END IF;
    
    -- Add payment_method column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='payment_method') THEN
        ALTER TABLE customers ADD COLUMN payment_method VARCHAR(50) DEFAULT 'mpesa';
    END IF;
    
    -- Add location column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='location') THEN
        ALTER TABLE customers ADD COLUMN location VARCHAR(255);
    END IF;
    
    -- Add router_allocated column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='router_allocated') THEN
        ALTER TABLE customers ADD COLUMN router_allocated VARCHAR(50) DEFAULT '192.168.1.1';
    END IF;
    
    -- Add ip_allocated column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='ip_allocated') THEN
        ALTER TABLE customers ADD COLUMN ip_allocated VARCHAR(50);
    END IF;
    
    -- Add last_payment column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='last_payment') THEN
        ALTER TABLE customers ADD COLUMN last_payment TIMESTAMP;
    END IF;
    
    -- Add avatar column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='avatar') THEN
        ALTER TABLE customers ADD COLUMN avatar VARCHAR(255);
    END IF;
    
    -- Add portal_login_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_login_id') THEN
        ALTER TABLE customers ADD COLUMN portal_login_id VARCHAR(100);
    END IF;
    
    -- Add portal_username column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_username') THEN
        ALTER TABLE customers ADD COLUMN portal_username VARCHAR(100);
    END IF;
    
    -- Add portal_password column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_password') THEN
        ALTER TABLE customers ADD COLUMN portal_password VARCHAR(255);
    END IF;
    
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan);

COMMIT;
