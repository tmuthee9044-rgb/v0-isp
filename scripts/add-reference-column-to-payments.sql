-- Add missing reference column to payments table
-- Add reference column to payments table for transaction references like MPESA codes
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference varchar;

-- Update existing records to copy reference_number to reference if needed
UPDATE payments SET reference = reference_number WHERE reference IS NULL AND reference_number IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN payments.reference IS 'Transaction reference (e.g. MPESA transaction code, bank slip number)';
