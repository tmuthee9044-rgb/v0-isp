-- Add unique constraint to prevent duplicate IP addresses in customer_services
-- First, identify and handle any existing duplicates
-- Updated status check from 'pending_payment' to 'pending' to match enum
WITH duplicate_ips AS (
    SELECT ip_address, COUNT(*) as count
    FROM customer_services 
    WHERE ip_address IS NOT NULL 
    AND status IN ('active', 'pending')
    GROUP BY ip_address 
    HAVING COUNT(*) > 1
)
UPDATE customer_services 
SET ip_address = NULL 
WHERE ip_address IN (SELECT ip_address FROM duplicate_ips)
AND id NOT IN (
    SELECT MIN(id) 
    FROM customer_services 
    WHERE ip_address IN (SELECT ip_address FROM duplicate_ips)
    GROUP BY ip_address
);

-- Now add the unique constraint
ALTER TABLE customer_services 
ADD CONSTRAINT unique_customer_services_ip_address 
UNIQUE (ip_address);

-- Add comment
COMMENT ON CONSTRAINT unique_customer_services_ip_address ON customer_services IS 'Ensures no duplicate IP addresses are assigned to active services';
