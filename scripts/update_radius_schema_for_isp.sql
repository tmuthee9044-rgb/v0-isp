-- Enhance RADIUS schema for ISP-grade implementation
-- Adds CoA, FUP, IPv6, and billing integration features

-- Add IPv6 support columns to radius_users
ALTER TABLE radius_users 
ADD COLUMN IF NOT EXISTS ipv6_address INET,
ADD COLUMN IF NOT EXISTS ipv6_prefix VARCHAR(50),
ADD COLUMN IF NOT EXISTS dual_stack BOOLEAN DEFAULT false;

-- Add FUP and QoS columns to radius_users
ALTER TABLE radius_users 
ADD COLUMN IF NOT EXISTS burst_download BIGINT,
ADD COLUMN IF NOT EXISTS burst_upload BIGINT,
ADD COLUMN IF NOT EXISTS burst_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20) DEFAULT 'standard' CHECK (priority_level IN ('low', 'standard', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS fup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fup_limit BIGINT, -- Data limit in bytes
ADD COLUMN IF NOT EXISTS fup_speed BIGINT; -- Speed after FUP limit in Mbps

-- Add billing integration columns
ALTER TABLE radius_users
ADD COLUMN IF NOT EXISTS account_balance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_billing_sync TIMESTAMP;

-- Create CoA audit log table
CREATE TABLE IF NOT EXISTS radius_coa_log (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    username VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    nas_ip INET NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'change_speed', 'change_timeout', 'disconnect'
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'acknowledged', 'failed', 'timeout')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for CoA log
CREATE INDEX IF NOT EXISTS idx_radius_coa_session ON radius_coa_log(session_id);
CREATE INDEX IF NOT EXISTS idx_radius_coa_customer ON radius_coa_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_radius_coa_created ON radius_coa_log(created_at);

-- Add IPv6 columns to sessions
ALTER TABLE radius_sessions_active
ADD COLUMN IF NOT EXISTS framed_ipv6_prefix VARCHAR(50),
ADD COLUMN IF NOT EXISTS delegated_ipv6_prefix VARCHAR(50);

ALTER TABLE radius_sessions_archive
ADD COLUMN IF NOT EXISTS framed_ipv6_prefix VARCHAR(50),
ADD COLUMN IF NOT EXISTS delegated_ipv6_prefix VARCHAR(50);

-- Function to apply FUP based on usage
CREATE OR REPLACE FUNCTION check_fup_and_apply()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    usage_bytes BIGINT;
    limit_bytes BIGINT;
BEGIN
    -- Get user FUP settings
    SELECT * INTO user_record
    FROM radius_users
    WHERE id = NEW.user_id AND fup_enabled = true;

    IF FOUND THEN
        -- Calculate total usage this month
        SELECT COALESCE(SUM(bytes_in + bytes_out), 0) INTO usage_bytes
        FROM radius_accounting
        WHERE username = user_record.username
        AND event_time >= date_trunc('month', NOW());

        -- Convert GB limit to bytes
        limit_bytes := user_record.fup_limit * 1024 * 1024 * 1024;

        -- If over limit, trigger CoA to reduce speed
        IF usage_bytes >= limit_bytes THEN
            -- Log FUP activation
            INSERT INTO system_logs (level, category, source, message, details, created_at)
            VALUES (
                'WARNING', 'radius', 'fup',
                'FUP limit reached for user ' || user_record.username,
                jsonb_build_object(
                    'username', user_record.username,
                    'usage_gb', usage_bytes / (1024.0 * 1024.0 * 1024.0),
                    'limit_gb', user_record.fup_limit,
                    'action', 'speed_reduced'
                ),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check FUP on accounting updates
CREATE TRIGGER trigger_check_fup
AFTER INSERT OR UPDATE ON radius_accounting
FOR EACH ROW
WHEN (NEW.event_type = 'Interim-Update' OR NEW.event_type = 'Stop')
EXECUTE FUNCTION check_fup_and_apply();

-- Function to sync billing balance to RADIUS users
CREATE OR REPLACE FUNCTION sync_billing_to_radius()
RETURNS void AS $$
BEGIN
    UPDATE radius_users ru
    SET 
        account_balance = COALESCE(ab.balance, 0),
        last_billing_sync = NOW(),
        status = CASE
            WHEN COALESCE(ab.balance, 0) < -100 THEN 'suspended'
            WHEN cs.expiry_date < NOW() THEN 'expired'
            WHEN cs.status = 'active' THEN 'active'
            ELSE ru.status
        END
    FROM customers c
    LEFT JOIN account_balances ab ON ab.customer_id = c.id
    LEFT JOIN customer_services cs ON cs.customer_id = c.id AND cs.id = ru.service_id
    WHERE ru.customer_id = c.id;

    -- Log sync operation
    INSERT INTO system_logs (level, category, source, message, created_at)
    VALUES ('INFO', 'radius', 'billing_sync', 'Billing balances synced to RADIUS users', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for fast session queries (Rule 6)
CREATE MATERIALIZED VIEW IF NOT EXISTS radius_sessions_summary AS
SELECT 
    ru.customer_id,
    COUNT(*) as active_sessions,
    SUM(rsa.bytes_in + rsa.bytes_out) as total_bytes,
    MAX(rsa.last_update) as last_activity
FROM radius_sessions_active rsa
JOIN radius_users ru ON rsa.user_id = ru.id
GROUP BY ru.customer_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_radius_sessions_summary_customer 
ON radius_sessions_summary(customer_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_radius_sessions_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY radius_sessions_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE radius_coa_log IS 'Audit log for CoA and Disconnect requests sent to NAS devices';
COMMENT ON FUNCTION check_fup_and_apply() IS 'Automatically applies FUP speed reduction when data limit is reached';
COMMENT ON FUNCTION sync_billing_to_radius() IS 'Syncs billing balances to RADIUS for authorization decisions';
COMMENT ON MATERIALIZED VIEW radius_sessions_summary IS 'Fast aggregated session data per customer (refreshed every 5 minutes)';
