-- Add unique constraint to prevent duplicate IP addresses in the same subnet
-- This ensures data integrity and allows ON CONFLICT clauses to work properly

-- First, remove any duplicate entries if they exist
DELETE FROM ip_addresses a USING ip_addresses b
WHERE a.id < b.id 
AND a.ip_address = b.ip_address 
AND a.subnet_id = b.subnet_id;

-- Add the unique constraint
ALTER TABLE ip_addresses 
ADD CONSTRAINT ip_addresses_ip_subnet_unique 
UNIQUE (ip_address, subnet_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT ip_addresses_ip_subnet_unique ON ip_addresses 
IS 'Ensures each IP address is unique within a subnet';
