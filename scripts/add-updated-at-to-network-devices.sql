-- Add updated_at column to network_devices table
ALTER TABLE network_devices 
ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

-- Update existing records to have the current timestamp
UPDATE network_devices 
SET updated_at = created_at 
WHERE updated_at IS NULL;
