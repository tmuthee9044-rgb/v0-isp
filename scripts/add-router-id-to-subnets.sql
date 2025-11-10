-- Add router_id column to subnets table to link subnets to specific routers
ALTER TABLE subnets ADD COLUMN router_id INTEGER;

-- Add foreign key constraint to reference network_devices table
ALTER TABLE subnets ADD CONSTRAINT fk_subnets_router_id 
    FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_subnets_router_id ON subnets(router_id);
