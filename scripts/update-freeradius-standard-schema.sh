#!/bin/bash

# Update FreeRADIUS to use standard schema
# This script updates the SQL module configuration to use the official FreeRADIUS queries

set -e

echo "================================================"
echo "Updating FreeRADIUS to Standard Schema"
echo "================================================"

# Check if FreeRADIUS is installed
if [ ! -d "/etc/freeradius/3.0" ]; then
    echo "Error: FreeRADIUS not found at /etc/freeradius/3.0"
    exit 1
fi

# Backup current SQL configuration
echo "[1/5] Backing up current configuration..."
sudo cp /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-available/sql.backup.$(date +%Y%m%d_%H%M%S)

# Update SQL module configuration
echo "[2/5] Updating SQL module configuration..."
sudo tee /etc/freeradius/3.0/mods-available/sql > /dev/null <<'EOF'
sql {
    driver = "rlm_sql_postgresql"
    
    dialect = "postgresql"
    
    server = "localhost"
    port = 5432
    login = "isp_admin"
    password = "1234"
    radius_db = "isp_system"
    
    acct_table1 = "radacct"
    acct_table2 = "radacct"
    postauth_table = "radpostauth"
    authcheck_table = "radcheck"
    groupcheck_table = "radgroupcheck"
    authreply_table = "radreply"
    groupreply_table = "radgroupreply"
    usergroup_table = "radusergroup"
    
    read_groups = yes
    read_profiles = yes
    read_clients = yes
    delete_stale_sessions = yes
    
    sql_user_name = "%{User-Name}"
    
    # Client query to load NAS devices from database
    client_query = "SELECT id, nasname, shortname, type, secret, server FROM nas"
    
    # Standard FreeRADIUS authorize queries
    authorize_check_query = "SELECT id, username, attribute, value, op FROM ${authcheck_table} WHERE username = '%{SQL-User-Name}' ORDER BY id"
    
    authorize_reply_query = "SELECT id, username, attribute, value, op FROM ${authreply_table} WHERE username = '%{SQL-User-Name}' ORDER BY id"
    
    authorize_group_check_query = "SELECT id, groupname, attribute, Value, op FROM ${groupcheck_table} WHERE groupname = '%{${group_attribute}}' ORDER BY id"
    
    authorize_group_reply_query = "SELECT id, groupname, attribute, value, op FROM ${groupreply_table} WHERE groupname = '%{${group_attribute}}' ORDER BY id"
    
    group_membership_query = "SELECT groupname FROM ${usergroup_table} WHERE username='%{SQL-User-Name}' ORDER BY priority"
    
    # Standard accounting queries
    accounting {
        reference = "%{tolower:type.%{Acct-Status-Type}}"
        
        type {
            accounting-on {
                query = "UPDATE ${....acct_table1} SET AcctStopTime = TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), AcctUpdateTime = TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), AcctTerminateCause = '%{%{Acct-Terminate-Cause}:-NAS-Reboot}', AcctSessionTime = (EXTRACT(EPOCH FROM (TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}) - AcctStartTime)))::bigint WHERE AcctStopTime IS NULL AND NASIPAddress = '%{NAS-IP-Address}' AND AcctStartTime <= TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l})"
            }
            
            accounting-off {
                query = "${..accounting-on.query}"
            }
            
            start {
                query = "INSERT INTO ${....acct_table1} (AcctSessionId, AcctUniqueId, UserName, Realm, NASIPAddress, NASPortId, NASPortType, AcctStartTime, AcctUpdateTime, AcctAuthentic, ConnectInfo_start, CalledStationId, CallingStationId, ServiceType, FramedProtocol, FramedIPAddress) VALUES ('%{Acct-Session-Id}', '%{Acct-Unique-Session-Id}', '%{SQL-User-Name}', '%{Realm}', '%{NAS-IP-Address}', '%{%{NAS-Port-ID}:-%{NAS-Port}}', '%{NAS-Port-Type}', TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), '%{Acct-Authentic}', '%{Connect-Info}', '%{Called-Station-Id}', '%{Calling-Station-Id}', '%{Service-Type}', '%{Framed-Protocol}', NULLIF('%{Framed-IP-Address}', '')::inet)"
            }
            
            interim-update {
                query = "UPDATE ${....acct_table1} SET AcctUpdateTime = TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), AcctSessionTime = %{%{Acct-Session-Time}:-0}, AcctInputOctets = %{%{Acct-Input-Octets}:-0}::bigint + (%{%{Acct-Input-Gigawords}:-0}::bigint * 4294967296), AcctOutputOctets = %{%{Acct-Output-Octets}:-0}::bigint + (%{%{Acct-Output-Gigawords}:-0}::bigint * 4294967296), FramedIPAddress = NULLIF('%{Framed-IP-Address}', '')::inet WHERE AcctUniqueId = '%{Acct-Unique-Session-Id}'"
            }
            
            stop {
                query = "UPDATE ${....acct_table1} SET AcctStopTime = TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), AcctUpdateTime = TO_TIMESTAMP(%{%{integer:Event-Timestamp}:-%l}), AcctSessionTime = %{%{Acct-Session-Time}:-0}, AcctInputOctets = %{%{Acct-Input-Octets}:-0}::bigint + (%{%{Acct-Input-Gigawords}:-0}::bigint * 4294967296), AcctOutputOctets = %{%{Acct-Output-Octets}:-0}::bigint + (%{%{Acct-Output-Gigawords}:-0}::bigint * 4294967296), AcctTerminateCause = '%{Acct-Terminate-Cause}', FramedIPAddress = NULLIF('%{Framed-IP-Address}', '')::inet, ConnectInfo_stop = '%{Connect-Info}' WHERE AcctUniqueId = '%{Acct-Unique-Session-Id}'"
            }
        }
    }
    
    # Post-Auth query
    post-auth {
        query = "INSERT INTO ${..postauth_table} (username, pass, reply, authdate, CalledStationId, CallingStationId) VALUES ('%{SQL-User-Name}', '%{%{User-Password}:-%{Chap-Password}}', '%{reply:Packet-Type}', NOW(), '%{Called-Station-Id}', '%{Calling-Station-Id}')"
    }
    
    pool {
        start = 5
        min = 4
        max = 10
        spare = 3
        uses = 0
        lifetime = 0
        idle_timeout = 60
    }
}
EOF

echo "[3/5] Creating standard SQL queries directory..."
sudo mkdir -p /etc/freeradius/3.0/mods-config/sql/main/postgresql

echo "[4/5] Enabling SQL module..."
sudo ln -sf /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql

echo "[5/5] Testing configuration..."
sudo freeradius -C

echo ""
echo "================================================"
echo "✓ FreeRADIUS updated to use standard schema"
echo "================================================"
echo ""
echo "Restart FreeRADIUS to apply changes:"
echo "  sudo systemctl restart freeradius"
echo ""
