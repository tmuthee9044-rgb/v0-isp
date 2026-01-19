-- Add missing days_requested column to leave_requests table
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS days_requested INTEGER NOT NULL DEFAULT 0;

-- Update existing records to calculate days_requested from start and end dates
UPDATE leave_requests
SET days_requested = EXTRACT(DAY FROM (end_date - start_date)) + 1
WHERE days_requested = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_days_requested ON leave_requests(days_requested);
