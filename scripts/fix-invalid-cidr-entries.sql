-- Migration script to fix existing invalid CIDR entries in the database

-- First, let's identify and log any invalid entries
DO $$
DECLARE
    invalid_subnet RECORD;
    fixed_count INTEGER := 0;
BEGIN
    -- Check for invalid subnets and attempt to fix them
    FOR invalid_subnet IN 
        SELECT id, name, network::text as network_text
        FROM subnets 
        WHERE network IS NOT NULL
    LOOP
        BEGIN
            -- Try to validate the existing CIDR by casting it
            PERFORM invalid_subnet.network_text::cidr;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the invalid entry
            RAISE NOTICE 'Found invalid CIDR in subnet ID %: % (name: %)', 
                invalid_subnet.id, invalid_subnet.network_text, invalid_subnet.name;
            
            -- Mark as inactive instead of deleting
            UPDATE subnets 
            SET status = 'invalid', 
                description = COALESCE(description, '') || ' [INVALID CIDR - NEEDS MANUAL REVIEW]'
            WHERE id = invalid_subnet.id;
            
            fixed_count := fixed_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Marked % invalid CIDR entries for manual review', fixed_count;
END $$;

-- Check for invalid IP addresses in ip_addresses table
DO $$
DECLARE
    invalid_ip RECORD;
    fixed_count INTEGER := 0;
BEGIN
    -- Check for invalid IP addresses
    FOR invalid_ip IN 
        SELECT id, ip_address::text as ip_text
        FROM ip_addresses 
        WHERE ip_address IS NOT NULL
    LOOP
        BEGIN
            -- Try to validate the existing IP by casting it
            PERFORM invalid_ip.ip_text::inet;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the invalid entry
            RAISE NOTICE 'Found invalid IP address ID %: %', 
                invalid_ip.id, invalid_ip.ip_text;
            
            -- Mark as invalid instead of deleting
            UPDATE ip_addresses 
            SET status = 'invalid'
            WHERE id = invalid_ip.id;
            
            fixed_count := fixed_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Marked % invalid IP addresses for manual review', fixed_count;
END $$;

-- Add constraints to prevent future invalid entries
ALTER TABLE subnets 
ADD CONSTRAINT check_valid_network 
CHECK (network IS NOT NULL);

ALTER TABLE ip_addresses 
ADD CONSTRAINT check_valid_ip_address 
CHECK (ip_address IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subnets_network ON subnets USING gist (network inet_ops);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON ip_addresses USING btree (ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_status ON ip_addresses (subnet_id, status);

-- Add a function to validate CIDR overlaps
CREATE OR REPLACE FUNCTION check_subnet_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the new/updated subnet overlaps with existing ones
    IF EXISTS (
        SELECT 1 FROM subnets 
        WHERE id != COALESCE(NEW.id, 0)
        AND status = 'active'
        AND (network && NEW.network OR NEW.network && network)
    ) THEN
        RAISE EXCEPTION 'Subnet % overlaps with existing subnet', NEW.network;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent overlapping subnets
DROP TRIGGER IF EXISTS trigger_check_subnet_overlap ON subnets;
CREATE TRIGGER trigger_check_subnet_overlap
    BEFORE INSERT OR UPDATE ON subnets
    FOR EACH ROW
    EXECUTE FUNCTION check_subnet_overlap();

COMMIT;
