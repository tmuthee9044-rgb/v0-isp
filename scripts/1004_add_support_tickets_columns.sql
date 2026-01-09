-- Add missing columns to support_tickets table for proper metrics calculation per rule 1

-- Add satisfaction_rating column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'satisfaction_rating'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN satisfaction_rating DECIMAL(2,1) CHECK (satisfaction_rating >= 0 AND satisfaction_rating <= 5);
  END IF;
END $$;

-- Add index for performance per rule 6
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_status ON support_tickets(created_at, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_satisfaction ON support_tickets(satisfaction_rating) WHERE satisfaction_rating IS NOT NULL;
