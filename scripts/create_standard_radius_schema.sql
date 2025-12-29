-- Standard FreeRADIUS PostgreSQL Schema
-- This creates the official FreeRADIUS tables and migrates existing data

-- Create standard radacct table for accounting
CREATE TABLE IF NOT EXISTS radacct (
    RadAcctId           BIGSERIAL PRIMARY KEY,
    AcctSessionId       TEXT NOT NULL,
    AcctUniqueId        TEXT NOT NULL UNIQUE,
    UserName            TEXT,
    GroupName           TEXT,
    Realm               TEXT,
    NASIPAddress        INET NOT NULL,
    NASPortId           TEXT,
    NASPortType         TEXT,
    AcctStartTime       TIMESTAMP WITH TIME ZONE,
    AcctUpdateTime      TIMESTAMP WITH TIME ZONE,
    AcctStopTime        TIMESTAMP WITH TIME ZONE,
    AcctInterval        BIGINT,
    AcctSessionTime     BIGINT,
    AcctAuthentic       TEXT,
    ConnectInfo_start   TEXT,
    ConnectInfo_stop    TEXT,
    AcctInputOctets     BIGINT,
    AcctOutputOctets    BIGINT,
    CalledStationId     TEXT,
    CallingStationId    TEXT,
    AcctTerminateCause  TEXT,
    ServiceType         TEXT,
    FramedProtocol      TEXT,
    FramedIPAddress     INET,
    FramedIPv6Address   INET,
    FramedIPv6Prefix    INET,
    FramedInterfaceId   TEXT,
    DelegatedIPv6Prefix INET
);

-- Indexes for radacct
CREATE INDEX IF NOT EXISTS radacct_active_session_idx ON radacct (AcctUniqueId) WHERE AcctStopTime IS NULL;
CREATE INDEX IF NOT EXISTS radacct_bulk_close ON radacct (NASIPAddress, AcctStartTime) WHERE AcctStopTime IS NULL;
CREATE INDEX IF NOT EXISTS radacct_bulk_timeout ON radacct (AcctStopTime NULLS FIRST, AcctUpdateTime);
CREATE INDEX IF NOT EXISTS radacct_start_user_idx ON radacct (AcctStartTime, UserName);

-- Create radcheck table for user authentication attributes
CREATE TABLE IF NOT EXISTS radcheck (
    id          SERIAL PRIMARY KEY,
    UserName    TEXT NOT NULL DEFAULT '',
    Attribute   TEXT NOT NULL DEFAULT '',
    op          VARCHAR(2) NOT NULL DEFAULT '==',
    Value       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radcheck_UserName ON radcheck (UserName, Attribute);

-- Create radreply table for user reply attributes
CREATE TABLE IF NOT EXISTS radreply (
    id          SERIAL PRIMARY KEY,
    UserName    TEXT NOT NULL DEFAULT '',
    Attribute   TEXT NOT NULL DEFAULT '',
    op          VARCHAR(2) NOT NULL DEFAULT '=',
    Value       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radreply_UserName ON radreply (UserName, Attribute);

-- Create radgroupcheck table for group check attributes
CREATE TABLE IF NOT EXISTS radgroupcheck (
    id          SERIAL PRIMARY KEY,
    GroupName   TEXT NOT NULL DEFAULT '',
    Attribute   TEXT NOT NULL DEFAULT '',
    op          VARCHAR(2) NOT NULL DEFAULT '==',
    Value       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupcheck_GroupName ON radgroupcheck (GroupName, Attribute);

-- Create radgroupreply table for group reply attributes
CREATE TABLE IF NOT EXISTS radgroupreply (
    id          SERIAL PRIMARY KEY,
    GroupName   TEXT NOT NULL DEFAULT '',
    Attribute   TEXT NOT NULL DEFAULT '',
    op          VARCHAR(2) NOT NULL DEFAULT '=',
    Value       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupreply_GroupName ON radgroupreply (GroupName, Attribute);

-- Create radusergroup table for user-to-group mappings
CREATE TABLE IF NOT EXISTS radusergroup (
    id          SERIAL PRIMARY KEY,
    UserName    TEXT NOT NULL DEFAULT '',
    GroupName   TEXT NOT NULL DEFAULT '',
    priority    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS radusergroup_UserName ON radusergroup (UserName);

-- Create radpostauth table for post-authentication logging
CREATE TABLE IF NOT EXISTS radpostauth (
    id                  BIGSERIAL PRIMARY KEY,
    username            TEXT NOT NULL,
    pass                TEXT,
    reply               TEXT,
    CalledStationId     TEXT,
    CallingStationId    TEXT,
    authdate            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create nas table for network access servers (routers)
CREATE TABLE IF NOT EXISTS nas (
    id          SERIAL PRIMARY KEY,
    nasname     TEXT NOT NULL,
    shortname   TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'other',
    ports       INTEGER,
    secret      TEXT NOT NULL,
    server      TEXT,
    community   TEXT,
    description TEXT
);
CREATE INDEX IF NOT EXISTS nas_nasname ON nas (nasname);

-- Migrate data from radius_users to radcheck and radreply
DO $$
BEGIN
    -- Migrate user passwords to radcheck
    INSERT INTO radcheck (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Cleartext-Password',
        ':=',
        password_hash
    FROM radius_users
    WHERE NOT EXISTS (
        SELECT 1 FROM radcheck 
        WHERE radcheck.UserName = radius_users.username 
        AND radcheck.Attribute = 'Cleartext-Password'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate bandwidth limits to radreply
    INSERT INTO radreply (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Mikrotik-Rate-Limit',
        ':=',
        CONCAT(download_limit::text, 'M/', upload_limit::text, 'M')
    FROM radius_users
    WHERE download_limit IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM radreply 
        WHERE radreply.UserName = radius_users.username 
        AND radreply.Attribute = 'Mikrotik-Rate-Limit'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate session timeout to radreply
    INSERT INTO radreply (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Session-Timeout',
        ':=',
        session_timeout::text
    FROM radius_users
    WHERE session_timeout IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM radreply 
        WHERE radreply.UserName = radius_users.username 
        AND radreply.Attribute = 'Session-Timeout'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate idle timeout to radreply
    INSERT INTO radreply (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Idle-Timeout',
        ':=',
        idle_timeout::text
    FROM radius_users
    WHERE idle_timeout IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM radreply 
        WHERE radreply.UserName = radius_users.username 
        AND radreply.Attribute = 'Idle-Timeout'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate IP address to radreply
    INSERT INTO radreply (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Framed-IP-Address',
        ':=',
        ip_address::text
    FROM radius_users
    WHERE ip_address IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM radreply 
        WHERE radreply.UserName = radius_users.username 
        AND radreply.Attribute = 'Framed-IP-Address'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate simultaneous use to radreply
    INSERT INTO radreply (UserName, Attribute, op, Value)
    SELECT 
        username,
        'Simultaneous-Use',
        ':=',
        simultaneous_use::text
    FROM radius_users
    WHERE simultaneous_use IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM radreply 
        WHERE radreply.UserName = radius_users.username 
        AND radreply.Attribute = 'Simultaneous-Use'
    )
    ON CONFLICT DO NOTHING;

    -- Migrate routers to nas table
    INSERT INTO nas (nasname, shortname, type, secret, description)
    SELECT 
        COALESCE(ip_address::text, '127.0.0.1'),
        COALESCE(name, 'router-' || id::text),
        'other',
        COALESCE(
            (SELECT setting_value FROM system_settings WHERE setting_key = 'radius_shared_secret'),
            'testing123'
        ),
        name || ' - ' || COALESCE(location, 'Unknown location')
    FROM network_devices
    WHERE device_type = 'router'
    AND NOT EXISTS (
        SELECT 1 FROM nas 
        WHERE nas.nasname = COALESCE(network_devices.ip_address::text, '127.0.0.1')
    )
    ON CONFLICT DO NOTHING;

END $$;

-- Create view to maintain backward compatibility with radius_users queries
CREATE OR REPLACE VIEW radius_users_view AS
SELECT 
    rc.UserName as username,
    rc.Value as password_hash,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM radcheck 
            WHERE UserName = rc.UserName 
            AND Attribute = 'Cleartext-Password'
        ) THEN 'active'
        ELSE 'inactive'
    END as status,
    NULL::timestamp as expiry_date,
    COALESCE(
        (SELECT CAST(SPLIT_PART(SPLIT_PART(Value, '/', 1), 'M', 1) AS INTEGER)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Mikrotik-Rate-Limit' 
         LIMIT 1),
        NULL
    ) as download_limit,
    COALESCE(
        (SELECT CAST(SPLIT_PART(SPLIT_PART(Value, '/', 2), 'M', 1) AS INTEGER)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Mikrotik-Rate-Limit' 
         LIMIT 1),
        NULL
    ) as upload_limit,
    COALESCE(
        (SELECT CAST(Value AS INTEGER)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Session-Timeout' 
         LIMIT 1),
        NULL
    ) as session_timeout,
    COALESCE(
        (SELECT CAST(Value AS INTEGER)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Idle-Timeout' 
         LIMIT 1),
        NULL
    ) as idle_timeout,
    COALESCE(
        (SELECT CAST(Value AS INET)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Framed-IP-Address' 
         LIMIT 1),
        NULL
    ) as ip_address,
    COALESCE(
        (SELECT CAST(Value AS INTEGER)
         FROM radreply 
         WHERE UserName = rc.UserName 
         AND Attribute = 'Simultaneous-Use' 
         LIMIT 1),
        1
    ) as simultaneous_use,
    NOW() as created_at,
    NOW() as updated_at
FROM radcheck rc
WHERE rc.Attribute = 'Cleartext-Password';

COMMENT ON VIEW radius_users_view IS 'Backward compatibility view for radius_users table queries';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON radacct TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radcheck TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radreply TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radgroupcheck TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radgroupreply TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radusergroup TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON radpostauth TO isp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON nas TO isp_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO isp_admin;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Standard FreeRADIUS schema created successfully!';
    RAISE NOTICE 'Data migrated from custom tables to standard tables.';
    RAISE NOTICE 'Next step: Update FreeRADIUS SQL module to use standard queries.';
END $$;
