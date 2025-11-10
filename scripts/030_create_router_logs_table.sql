-- Create router_logs table for tracking suspension/reactivation events
CREATE TABLE IF NOT EXISTS router_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES customer_services(id) ON DELETE CASCADE,
    router_id VARCHAR(100),
    action VARCHAR(50) NOT NULL, -- 'suspend', 'reactivate', 'provision', 'deprovision'
    service_type VARCHAR(50), -- 'pppoe', 'dhcp', 'hotspot', 'static_ip', 'radius'
    command_sent TEXT, -- The actual router command executed
    response_received TEXT, -- Router response
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retry'
    error_message TEXT,
    executed_by VARCHAR(100), -- User ID or 'system' for automated actions
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    metadata JSONB -- Additional data like IP addresses, profiles, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_router_logs_customer_id ON router_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_router_logs_service_id ON router_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_router_logs_action ON router_logs(action);
CREATE INDEX IF NOT EXISTS idx_router_logs_status ON router_logs(status);
CREATE INDEX IF NOT EXISTS idx_router_logs_executed_at ON router_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_router_logs_retry ON router_logs(status, next_retry_at) WHERE status = 'retry';

-- Add comments for documentation
COMMENT ON TABLE router_logs IS 'Logs all router provisioning actions including suspension and reactivation';
COMMENT ON COLUMN router_logs.action IS 'Type of action performed: suspend, reactivate, provision, deprovision';
COMMENT ON COLUMN router_logs.service_type IS 'Service type: pppoe, dhcp, hotspot, static_ip, radius';
COMMENT ON COLUMN router_logs.command_sent IS 'Actual router command that was executed';
COMMENT ON COLUMN router_logs.response_received IS 'Response from the router';
COMMENT ON COLUMN router_logs.status IS 'Execution status: pending, success, failed, retry';
COMMENT ON COLUMN router_logs.metadata IS 'Additional context like IP addresses, profiles, etc.';

-- Create function to automatically retry failed router commands
CREATE OR REPLACE FUNCTION schedule_router_retry()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is set to 'retry', schedule next retry
    IF NEW.status = 'retry' AND NEW.retry_count < 3 THEN
        NEW.next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes' * POWER(2, NEW.retry_count);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for retry scheduling
DROP TRIGGER IF EXISTS trigger_router_logs_retry ON router_logs;
CREATE TRIGGER trigger_router_logs_retry
    BEFORE UPDATE ON router_logs
    FOR EACH ROW
    EXECUTE FUNCTION schedule_router_retry();
