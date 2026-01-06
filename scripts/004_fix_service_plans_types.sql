-- Fix service_plans column types that were created incorrectly
-- This script changes priority_level from INTEGER to VARCHAR to accept "standard", "high", "low" values
-- Rule 1, 4, 7: Ensure all form data is correctly stored in database

-- Fix priority_level column type
DO $$ 
BEGIN
    -- Check if column exists and change type if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'priority_level'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        -- Drop the column and recreate with correct type
        ALTER TABLE service_plans DROP COLUMN IF EXISTS priority_level;
        ALTER TABLE service_plans ADD COLUMN priority_level VARCHAR(50) DEFAULT 'standard';
        RAISE NOTICE 'Fixed priority_level column type from INTEGER to VARCHAR(50)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'priority_level'
    ) THEN
        -- Column doesn't exist, add it
        ALTER TABLE service_plans ADD COLUMN priority_level VARCHAR(50) DEFAULT 'standard';
        RAISE NOTICE 'Added priority_level column as VARCHAR(50)';
    ELSE
        RAISE NOTICE 'priority_level column already has correct type';
    END IF;
END $$;

-- Ensure all other text columns that might have been created as INTEGER are also VARCHAR
DO $$ 
BEGIN
    -- Fix service_type if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'service_type'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE service_plans DROP COLUMN IF EXISTS service_type;
        ALTER TABLE service_plans ADD COLUMN service_type VARCHAR(50);
        RAISE NOTICE 'Fixed service_type column type';
    END IF;

    -- Fix category if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'category'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE service_plans DROP COLUMN IF EXISTS category;
        ALTER TABLE service_plans ADD COLUMN category VARCHAR(50);
        RAISE NOTICE 'Fixed category column type';
    END IF;

    -- Fix billing_cycle if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'billing_cycle'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE service_plans DROP COLUMN IF EXISTS billing_cycle;
        ALTER TABLE service_plans ADD COLUMN billing_cycle VARCHAR(50) DEFAULT 'monthly';
        RAISE NOTICE 'Fixed billing_cycle column type';
    END IF;

    -- Fix limit_type if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'limit_type'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE service_plans DROP COLUMN IF EXISTS limit_type;
        ALTER TABLE service_plans ADD COLUMN limit_type VARCHAR(50) DEFAULT 'monthly';
        RAISE NOTICE 'Fixed limit_type column type';
    END IF;

    -- Fix action_after_limit if it's INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_plans' 
        AND column_name = 'action_after_limit'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE service_plans DROP COLUMN IF EXISTS action_after_limit;
        ALTER TABLE service_plans ADD COLUMN action_after_limit VARCHAR(50) DEFAULT 'throttle';
        RAISE NOTICE 'Fixed action_after_limit column type';
    END IF;
END $$;

RAISE NOTICE 'Service plans column type fixes completed';
