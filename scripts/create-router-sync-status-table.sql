-- Create router_sync_status table for tracking router synchronization status
CREATE TABLE IF NOT EXISTS router_sync_status (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    ip_address_id INTEGER REFERENCES ip_addresses(id) ON DELETE CASCADE,
    customer_service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_checked TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced TIMESTAMP WITHOUT TIME ZONE,
    sync_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_router_sync_status_router_id ON router_sync_status(router_id);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_status ON router_sync_status(sync_status);
CREATE INDEX IF NOT EXISTS idx_router_sync_status_last_checked ON router_sync_status(last_checked);

-- Insert some sample data for testing
INSERT INTO router_sync_status (router_id, ip_address_id, customer_service_id, sync_status, retry_count, sync_message)
SELECT 
    nd.id as router_id,
    ip.id as ip_address_id,
    cs.id as customer_service_id,
    CASE 
        WHEN RANDOM() < 0.7 THEN 'synced'
        WHEN RANDOM() < 0.9 THEN 'pending'
        ELSE 'failed'
    END as sync_status,
    FLOOR(RANDOM() * 3) as retry_count,
    CASE 
        WHEN RANDOM() < 0.5 THEN 'Configuration updated successfully'
        WHEN RANDOM() < 0.8 THEN 'Waiting for router response'
        ELSE 'Connection timeout - retrying'
    END as sync_message
FROM network_devices nd
CROSS JOIN ip_addresses ip
CROSS JOIN customer_services cs
WHERE nd.type = 'router' 
    AND ip.status = 'assigned'
    AND cs.status = 'active'
LIMIT 20;
