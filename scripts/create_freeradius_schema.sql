-- FreeRADIUS PostgreSQL Schema for ISP System
-- This creates all required tables for RADIUS authentication, authorization, and accounting

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS radacct CASCADE;
DROP TABLE IF EXISTS radpostauth CASCADE;
DROP TABLE IF EXISTS radusergroup CASCADE;
DROP TABLE IF EXISTS radgroupcheck CASCADE;
DROP TABLE IF EXISTS radgroupreply CASCADE;
DROP TABLE IF EXISTS radcheck CASCADE;
DROP TABLE IF EXISTS radreply CASCADE;
DROP TABLE IF EXISTS nas CASCADE;

-- Table: nas (Network Access Servers - Routers)
-- Stores information about devices that will authenticate through RADIUS
CREATE TABLE nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(128) NOT NULL,  -- IP address or hostname of the NAS device
    shortname VARCHAR(32),           -- Short name for the NAS
    type VARCHAR(30) DEFAULT 'other',-- Type of NAS (cisco, mikrotik, other)
    ports INTEGER,                   -- Number of ports
    secret VARCHAR(60) NOT NULL,     -- Shared secret for RADIUS communication
    server VARCHAR(64),              -- RADIUS server
    community VARCHAR(50),           -- SNMP community
    description VARCHAR(200),        -- Description of the NAS
    UNIQUE(nasname)
);

-- Table: radcheck (User Authentication)
-- Stores user credentials and authentication requirements
CREATE TABLE radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radcheck_username ON radcheck(username, attribute);

-- Table: radreply (User Reply Attributes)
-- Stores attributes to send back to NAS for authenticated users
CREATE TABLE radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radreply_username ON radreply(username, attribute);

-- Table: radgroupcheck (Group Check Attributes)
-- Stores authentication requirements for user groups
CREATE TABLE radgroupcheck (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radgroupcheck_groupname ON radgroupcheck(groupname, attribute);

-- Table: radgroupreply (Group Reply Attributes)
-- Stores reply attributes for user groups
CREATE TABLE radgroupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radgroupreply_groupname ON radgroupreply(groupname, attribute);

-- Table: radusergroup (User Group Membership)
-- Maps users to groups
CREATE TABLE radusergroup (
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (username, groupname)
);
CREATE INDEX radusergroup_username ON radusergroup(username);

-- Table: radacct (RADIUS Accounting)
-- Stores accounting data (session information, bandwidth usage)
CREATE TABLE radacct (
    radacctid BIGSERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL,
    acctuniqueid VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(64),
    groupname VARCHAR(64),
    realm VARCHAR(64),
    nasipaddress INET NOT NULL,
    nasportid VARCHAR(32),
    nasporttype VARCHAR(32),
    acctstarttime TIMESTAMP WITH TIME ZONE,
    acctupdatetime TIMESTAMP WITH TIME ZONE,
    acctstoptime TIMESTAMP WITH TIME ZONE,
    acctinterval INTEGER,
    acctsessiontime INTEGER,
    acctauthentic VARCHAR(32),
    connectinfo_start VARCHAR(50),
    connectinfo_stop VARCHAR(50),
    acctinputoctets BIGINT,
    acctoutputoctets BIGINT,
    calledstationid VARCHAR(50),
    callingstationid VARCHAR(50),
    acctterminatecause VARCHAR(32),
    servicetype VARCHAR(32),
    framedprotocol VARCHAR(32),
    framedipaddress INET,
    acctstartdelay INTEGER,
    acctstopdelay INTEGER,
    xascendsessionsvrkey VARCHAR(10),
    framedipv6address VARCHAR(45),
    framedipv6prefix VARCHAR(45),
    framedinterfaceid VARCHAR(44),
    delegatedipv6prefix VARCHAR(45)
);

CREATE INDEX radacct_active_session_idx ON radacct(acctsessionid, username, nasipaddress) WHERE acctstoptime IS NULL;
CREATE INDEX radacct_start_time_idx ON radacct(acctstarttime);
CREATE INDEX radacct_stop_time_idx ON radacct(acctstoptime);
CREATE INDEX radacct_username_idx ON radacct(username);
CREATE INDEX radacct_nasipaddress_idx ON radacct(nasipaddress);

-- Table: radpostauth (Post-Authentication Logging)
-- Stores authentication attempts (success and failure)
CREATE TABLE radpostauth (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    pass VARCHAR(64),
    reply VARCHAR(32),
    authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX radpostauth_username_idx ON radpostauth(username);
CREATE INDEX radpostauth_authdate_idx ON radpostauth(authdate);

-- Grant permissions to isp_admin user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO isp_admin;

-- Insert default localhost client (for testing)
INSERT INTO nas (nasname, shortname, type, secret, description) 
VALUES ('127.0.0.1', 'localhost', 'other', 'testing123', 'Local testing client')
ON CONFLICT (nasname) DO NOTHING;

-- Create a view to link RADIUS users with system customers
CREATE OR REPLACE VIEW radius_customers AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.email,
    c.phone,
    c.status as customer_status,
    s.id as service_id,
    s.username as radius_username,
    s.status as service_status,
    s.ip_address,
    sp.name as package_name,
    sp.download_speed,
    sp.upload_speed
FROM customers c
LEFT JOIN customer_services s ON c.id = s.customer_id
LEFT JOIN service_packages sp ON s.package_id = sp.id
WHERE s.username IS NOT NULL;

GRANT SELECT ON radius_customers TO isp_admin;

COMMENT ON TABLE nas IS 'Network Access Servers (routers) that can authenticate via RADIUS';
COMMENT ON TABLE radcheck IS 'User authentication credentials and requirements';
COMMENT ON TABLE radreply IS 'Attributes to return to NAS for authenticated users';
COMMENT ON TABLE radacct IS 'RADIUS accounting data - session info and bandwidth usage';
COMMENT ON TABLE radpostauth IS 'Log of all authentication attempts';
