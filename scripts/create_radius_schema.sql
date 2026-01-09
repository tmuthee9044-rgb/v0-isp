/*
 * Official FreeRADIUS PostgreSQL Schema
 * Creates all necessary tables for RADIUS authentication, authorization, and accounting
 */

-- Drop existing tables if they exist
DROP TABLE IF EXISTS radacct CASCADE;
DROP TABLE IF EXISTS radcheck CASCADE;
DROP TABLE IF EXISTS radreply CASCADE;
DROP TABLE IF EXISTS radgroupcheck CASCADE;
DROP TABLE IF EXISTS radgroupreply CASCADE;
DROP TABLE IF EXISTS radusergroup CASCADE;
DROP TABLE IF EXISTS radpostauth CASCADE;
DROP TABLE IF EXISTS nas CASCADE;

/*
 * Table: radacct
 * Stores RADIUS accounting records (sessions, bandwidth usage)
 */
CREATE TABLE radacct (
	RadAcctId		bigserial PRIMARY KEY,
	AcctSessionId		text NOT NULL,
	AcctUniqueId		text NOT NULL UNIQUE,
	UserName		text,
	GroupName		text,
	Realm			text,
	NASIPAddress		inet NOT NULL,
	NASPortId		text,
	NASPortType		text,
	AcctStartTime		timestamp with time zone,
	AcctUpdateTime		timestamp with time zone,
	AcctStopTime		timestamp with time zone,
	AcctInterval		bigint,
	AcctSessionTime		bigint,
	AcctAuthentic		text,
	ConnectInfo_start	text,
	ConnectInfo_stop	text,
	AcctInputOctets		bigint,
	AcctOutputOctets	bigint,
	CalledStationId		text,
	CallingStationId	text,
	AcctTerminateCause	text,
	ServiceType		text,
	FramedProtocol		text,
	FramedIPAddress		inet,
	FramedIPv6Address	inet,
	FramedIPv6Prefix	inet,
	FramedInterfaceId	text,
	DelegatedIPv6Prefix	inet
);

-- Indexes for radacct
CREATE INDEX radacct_active_session_idx ON radacct (AcctUniqueId) WHERE AcctStopTime IS NULL;
CREATE INDEX radacct_bulk_close ON radacct (NASIPAddress, AcctStartTime) WHERE AcctStopTime IS NULL;
CREATE INDEX radacct_bulk_timeout ON radacct (AcctStopTime NULLS FIRST, AcctUpdateTime);
CREATE INDEX radacct_start_user_idx ON radacct (AcctStartTime, UserName);

/*
 * Table: radcheck
 * Stores user authentication attributes (passwords, etc.)
 */
CREATE TABLE radcheck (
	id			serial PRIMARY KEY,
	UserName		text NOT NULL DEFAULT '',
	Attribute		text NOT NULL DEFAULT '',
	op			VARCHAR(2) NOT NULL DEFAULT '==',
	Value			text NOT NULL DEFAULT ''
);
CREATE INDEX radcheck_UserName ON radcheck (UserName, Attribute);

/*
 * Table: radgroupcheck
 * Stores group authentication attributes
 */
CREATE TABLE radgroupcheck (
	id			serial PRIMARY KEY,
	GroupName		text NOT NULL DEFAULT '',
	Attribute		text NOT NULL DEFAULT '',
	op			VARCHAR(2) NOT NULL DEFAULT '==',
	Value			text NOT NULL DEFAULT ''
);
CREATE INDEX radgroupcheck_GroupName ON radgroupcheck (GroupName, Attribute);

/*
 * Table: radgroupreply
 * Stores group reply attributes (bandwidth limits, etc.)
 */
CREATE TABLE radgroupreply (
	id			serial PRIMARY KEY,
	GroupName		text NOT NULL DEFAULT '',
	Attribute		text NOT NULL DEFAULT '',
	op			VARCHAR(2) NOT NULL DEFAULT '=',
	Value			text NOT NULL DEFAULT ''
);
CREATE INDEX radgroupreply_GroupName ON radgroupreply (GroupName, Attribute);

/*
 * Table: radreply
 * Stores user-specific reply attributes
 */
CREATE TABLE radreply (
	id			serial PRIMARY KEY,
	UserName		text NOT NULL DEFAULT '',
	Attribute		text NOT NULL DEFAULT '',
	op			VARCHAR(2) NOT NULL DEFAULT '=',
	Value			text NOT NULL DEFAULT ''
);
CREATE INDEX radreply_UserName ON radreply (UserName, Attribute);

/*
 * Table: radusergroup
 * Maps users to groups
 */
CREATE TABLE radusergroup (
	id			serial PRIMARY KEY,
	UserName		text NOT NULL DEFAULT '',
	GroupName		text NOT NULL DEFAULT '',
	priority		integer NOT NULL DEFAULT 0
);
CREATE INDEX radusergroup_UserName ON radusergroup (UserName);

/*
 * Table: radpostauth
 * Logs authentication attempts (successful and failed)
 */
CREATE TABLE radpostauth (
	id			bigserial PRIMARY KEY,
	username		text NOT NULL,
	pass			text,
	reply			text,
	CalledStationId		text,
	CallingStationId	text,
	authdate		timestamp with time zone NOT NULL DEFAULT now()
);

/*
 * Table: nas
 * Stores Network Access Server (router) definitions
 */
CREATE TABLE nas (
	id			serial PRIMARY KEY,
	nasname			text NOT NULL,
	shortname		text NOT NULL,
	type			text NOT NULL DEFAULT 'other',
	ports			integer,
	secret			text NOT NULL,
	server			text,
	community		text,
	description		text
);
CREATE INDEX nas_nasname ON nas (nasname);

-- Insert default NAS entry for testing
INSERT INTO nas (nasname, shortname, type, secret, description) 
VALUES ('127.0.0.1', 'localhost', 'other', 'testing123', 'Local testing NAS')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE radacct IS 'RADIUS accounting records - tracks user sessions and bandwidth usage';
COMMENT ON TABLE radcheck IS 'User authentication attributes - passwords and auth parameters';
COMMENT ON TABLE radreply IS 'User reply attributes - service parameters sent back to NAS';
COMMENT ON TABLE radgroupcheck IS 'Group authentication attributes';
COMMENT ON TABLE radgroupreply IS 'Group reply attributes - bandwidth limits, etc.';
COMMENT ON TABLE radusergroup IS 'User to group mappings';
COMMENT ON TABLE radpostauth IS 'Authentication attempt logs';
COMMENT ON TABLE nas IS 'Network Access Server (router) definitions';
