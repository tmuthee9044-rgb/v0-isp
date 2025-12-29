-- FreeRADIUS Standard Schema Migration for PostgreSQL
-- Creates standard RADIUS tables and migrates existing data

-- 1. Create NAS table (Network Access Servers / Routers)
CREATE TABLE IF NOT EXISTS nas (
  id SERIAL PRIMARY KEY,
  nasname VARCHAR(128) NOT NULL,
  shortname VARCHAR(32) NOT NULL,
  type VARCHAR(30) DEFAULT 'other',
  ports INT DEFAULT 1812,
  secret VARCHAR(60) NOT NULL,
  server VARCHAR(64),
  community VARCHAR(50),
  description VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS nas_nasname_idx ON nas (nasname);

-- 2. Create radcheck table (User authentication attributes)
CREATE TABLE IF NOT EXISTS radcheck (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '==',
  value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radcheck_username_idx ON radcheck (username);

-- 3. Create radreply table (User reply attributes)
CREATE TABLE IF NOT EXISTS radreply (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '=',
  value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radreply_username_idx ON radreply (username);

-- 4. Create radgroupcheck table (Group check attributes)
CREATE TABLE IF NOT EXISTS radgroupcheck (
  id SERIAL PRIMARY KEY,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '==',
  value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupcheck_groupname_idx ON radgroupcheck (groupname);

-- 5. Create radgroupreply table (Group reply attributes)
CREATE TABLE IF NOT EXISTS radgroupreply (
  id SERIAL PRIMARY KEY,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '=',
  value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupreply_groupname_idx ON radgroupreply (groupname);

-- 6. Create radusergroup table (User to group mapping)
CREATE TABLE IF NOT EXISTS radusergroup (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL DEFAULT '',
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  priority INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS radusergroup_username_idx ON radusergroup (username);

-- 7. Create radacct table (Accounting/session tracking)
CREATE TABLE IF NOT EXISTS radacct (
  radacctid BIGSERIAL PRIMARY KEY,
  acctsessionid VARCHAR(64) NOT NULL,
  acctuniqueid VARCHAR(32) NOT NULL UNIQUE,
  username VARCHAR(64) NOT NULL,
  realm VARCHAR(64),
  nasipaddress INET NOT NULL,
  nasportid VARCHAR(32),
  nasporttype VARCHAR(32),
  acctstarttime TIMESTAMP WITH TIME ZONE,
  acctupdatetime TIMESTAMP WITH TIME ZONE,
  acctstoptime TIMESTAMP WITH TIME ZONE,
  acctinterval BIGINT,
  acctsessiontime BIGINT,
  acctauthentic VARCHAR(32),
  connectinfo_start VARCHAR(128),
  connectinfo_stop VARCHAR(128),
  acctinputoctets BIGINT,
  acctoutputoctets BIGINT,
  calledstationid VARCHAR(50),
  callingstationid VARCHAR(50),
  acctterminatecause VARCHAR(32),
  servicetype VARCHAR(32),
  framedprotocol VARCHAR(32),
  framedipaddress INET,
  framedipv6address INET,
  framedipv6prefix INET,
  framedinterfaceid VARCHAR(44),
  delegatedipv6prefix INET,
  class VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS radacct_username_idx ON radacct (username);
CREATE INDEX IF NOT EXISTS radacct_session_idx ON radacct (acctsessionid);
CREATE INDEX IF NOT EXISTS radacct_start_idx ON radacct (acctstarttime);
CREATE INDEX IF NOT EXISTS radacct_stop_idx ON radacct (acctstoptime);
CREATE INDEX IF NOT EXISTS radacct_nasip_idx ON radacct (nasipaddress);

-- 8. Create radpostauth table (Post-authentication logging)
CREATE TABLE IF NOT EXISTS radpostauth (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  pass VARCHAR(64),
  reply VARCHAR(32),
  authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS radpostauth_username_idx ON radpostauth (username);
CREATE INDEX IF NOT EXISTS radpostauth_date_idx ON radpostauth (authdate);

-- 9. Migrate data from network_devices to nas table
INSERT INTO nas (nasname, shortname, type, secret, description)
SELECT 
  ip_address::VARCHAR,
  name,
  'mikrotik',
  COALESCE((configuration->>'radius_secret')::VARCHAR, 'changeme'),
  COALESCE(description, name)
FROM network_devices
WHERE status = 'active' AND device_type = 'router'
ON CONFLICT DO NOTHING;

-- 10. Migrate data from radius_users to radcheck (passwords)
INSERT INTO radcheck (username, attribute, op, value)
SELECT 
  username,
  'Cleartext-Password',
  ':=',
  password
FROM radius_users
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- 11. Add IP assignment attributes to radreply
INSERT INTO radreply (username, attribute, op, value)
SELECT 
  ru.username,
  'Framed-IP-Address',
  '=',
  cs.ip_address::VARCHAR
FROM radius_users ru
JOIN customer_services cs ON ru.customer_id = cs.customer_id
WHERE ru.is_active = true AND cs.status = 'active' AND cs.ip_address IS NOT NULL
ON CONFLICT DO NOTHING;

-- 12. Add bandwidth limits to radreply
INSERT INTO radreply (username, attribute, op, value)
SELECT 
  ru.username,
  'Mikrotik-Rate-Limit',
  '=',
  CONCAT(sp.download_speed_mbps, 'M/', sp.upload_speed_mbps, 'M')
FROM radius_users ru
JOIN customer_services cs ON ru.customer_id = cs.customer_id
JOIN service_plans sp ON cs.service_plan_id = sp.id
WHERE ru.is_active = true AND cs.status = 'active'
ON CONFLICT DO NOTHING;

-- 13. Create view for backward compatibility
CREATE OR REPLACE VIEW radius_users_view AS
SELECT 
  rc.id,
  rc.username,
  rc.value as password,
  CASE WHEN rc.value IS NOT NULL THEN true ELSE false END as is_active,
  NULL::INT as customer_id,
  NOW() as created_at,
  NOW() as updated_at
FROM radcheck rc
WHERE rc.attribute = 'Cleartext-Password';

GRANT SELECT ON nas, radcheck, radreply, radgroupcheck, radgroupreply, radusergroup, radacct, radpostauth TO isp_admin;
