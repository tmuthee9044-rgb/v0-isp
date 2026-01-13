-- Add UNIQUE constraint to radreply for (username, attribute) pairs
-- This allows ON CONFLICT clauses to work properly in the application
ALTER TABLE radreply 
ADD CONSTRAINT radreply_username_attribute_unique UNIQUE (username, attribute);
