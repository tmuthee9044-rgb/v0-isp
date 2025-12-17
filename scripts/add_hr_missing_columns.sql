-- Migration to add missing HR columns to observe rule 7
-- Run this script to add columns that exist in the schema but not in the database

-- Add performance_rating column to employees table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'performance_rating'
    ) THEN
        ALTER TABLE employees ADD COLUMN performance_rating VARCHAR(20);
        COMMENT ON COLUMN employees.performance_rating IS 'Current performance rating from latest review';
    END IF;
END $$;

-- Add days column to leave_requests table (alias for days_requested for backward compatibility)
DO $$ 
BEGIN
    -- Check if days_requested exists but days doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' 
        AND column_name = 'days_requested'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' 
        AND column_name = 'days'
    ) THEN
        -- Add days column as alias
        ALTER TABLE leave_requests ADD COLUMN days INTEGER;
        
        -- Copy existing data from days_requested to days
        UPDATE leave_requests SET days = days_requested WHERE days IS NULL;
        
        COMMENT ON COLUMN leave_requests.days IS 'Number of leave days requested (same as days_requested)';
    END IF;
END $$;

-- Create index for performance rating lookups
CREATE INDEX IF NOT EXISTS idx_employees_performance_rating ON employees(performance_rating);

-- Create index for leave request days
CREATE INDEX IF NOT EXISTS idx_leave_requests_days ON leave_requests(days);

-- Log the migration
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
VALUES (
    1,
    'migration',
    'system',
    0,
    '{"migration": "add_hr_missing_columns", "columns_added": ["employees.performance_rating", "leave_requests.days"], "timestamp": "' || NOW() || '"}'::jsonb,
    NOW()
) ON CONFLICT DO NOTHING;
