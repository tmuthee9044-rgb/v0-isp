#!/bin/bash

# Script to update RADIUS IP from 127.0.0.1 to actual network IP

set -e

echo "======================================"
echo "RADIUS IP Address Update Script"
echo "======================================"
echo ""

# Detect the host network IP address
echo "[INFO] Detecting host network IP address..."

RADIUS_HOST=""

# Method 1: Get IP from default route interface
if command -v ip &> /dev/null; then
    DEFAULT_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
    if [ -n "$DEFAULT_INTERFACE" ]; then
        RADIUS_HOST=$(ip addr show "$DEFAULT_INTERFACE" | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -n1)
    fi
fi

# Method 2: Use hostname -I (fallback)
if [ -z "$RADIUS_HOST" ] && command -v hostname &> /dev/null; then
    RADIUS_HOST=$(hostname -I | awk '{print $1}')
fi

# Method 3: Use ifconfig (fallback for older systems)
if [ -z "$RADIUS_HOST" ] && command -v ifconfig &> /dev/null; then
    RADIUS_HOST=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -n1)
fi

if [ -z "$RADIUS_HOST" ]; then
    echo "[ERROR] Could not detect network IP address"
    echo "Please run this script on a machine with a network interface"
    exit 1
fi

echo "[SUCCESS] Detected host IP: $RADIUS_HOST"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL environment variable is not set"
    echo "Please set it in your .env.local file or export it"
    exit 1
fi

echo "[INFO] Updating RADIUS host IP in database..."

# Update the database
psql "$DATABASE_URL" << EOF
-- Update RADIUS host IP
UPDATE system_config 
SET value = '"$RADIUS_HOST"', updated_at = NOW()
WHERE key = 'server.radius.host';

-- If the key doesn't exist, insert it
INSERT INTO system_config (key, value, created_at, updated_at) 
VALUES ('server.radius.host', '"$RADIUS_HOST"', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = '"$RADIUS_HOST"',
    updated_at = NOW();

-- Log the update
INSERT INTO system_logs (level, source, category, message, details, created_at) VALUES
    ('INFO', 'Configuration', 'radius_update', 
     'RADIUS host IP updated from 127.0.0.1 to actual network IP', 
     '{"old_ip": "127.0.0.1", "new_ip": "$RADIUS_HOST"}', 
     NOW());

-- Show the result
SELECT key, value FROM system_config WHERE key = 'server.radius.host';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "[SUCCESS] RADIUS host IP updated successfully!"
    echo "[INFO] New RADIUS host: $RADIUS_HOST"
    echo ""
    echo "Physical routers can now connect to this IP address."
    echo "Make sure to update your router configurations to use this IP."
else
    echo ""
    echo "[ERROR] Failed to update RADIUS host IP in database"
    exit 1
fi
