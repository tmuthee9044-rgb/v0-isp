#!/bin/bash

echo "=================================================="
echo "FreeRADIUS Clients Configuration Checker"
echo "=================================================="
echo ""

# Detect network IP
DETECTED_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+')
echo "[1] Detected Server IP: $DETECTED_IP"
echo ""

# Check if clients.conf exists
CLIENTS_CONF="/etc/freeradius/3.0/clients.conf"
if [ ! -f "$CLIENTS_CONF" ]; then
    echo "❌ ERROR: $CLIENTS_CONF does not exist!"
    exit 1
fi

echo "[2] Current clients.conf content:"
echo "-----------------------------------"
cat "$CLIENTS_CONF"
echo "-----------------------------------"
echo ""

# Check database for router IPs
echo "[3] Checking database for router IPs..."
ROUTER_IPS=$(sudo -u postgres psql -d isp -t -c "SELECT ip_address FROM network_devices WHERE device_type = 'router' AND status = 'active';" 2>/dev/null | grep -v '^$' | tr -d ' ')

if [ -z "$ROUTER_IPS" ]; then
    echo "⚠️  No active routers found in database"
else
    echo "Active Router IPs in database:"
    echo "$ROUTER_IPS"
fi
echo ""

# Check database for RADIUS shared secret
echo "[4] Checking RADIUS shared secret in database..."
DB_SECRET=$(sudo -u postgres psql -d isp -t -c "SELECT shared_secret FROM radius_servers WHERE id = 1 LIMIT 1;" 2>/dev/null | tr -d ' ')
if [ -z "$DB_SECRET" ]; then
    echo "⚠️  No shared secret found in database"
else
    echo "✓ Shared secret found in database (length: ${#DB_SECRET} chars)"
fi
echo ""

# Extract IPs from clients.conf
echo "[5] IPs configured in clients.conf:"
grep -E "^client |ipaddr = " "$CLIENTS_CONF" | grep -v "^#"
echo ""

# Check if localhost is being used
if grep -q "ipaddr = 127.0.0.1" "$CLIENTS_CONF" || grep -q "ipaddr = localhost" "$CLIENTS_CONF"; then
    echo "❌ PROBLEM FOUND: clients.conf is using localhost (127.0.0.1)"
    echo "   This will prevent external routers from connecting!"
    echo ""
fi

# Recommendations
echo "=================================================="
echo "RECOMMENDATIONS:"
echo "=================================================="
echo "1. Server IP should be: $DETECTED_IP"
echo "2. clients.conf should include:"
echo "   - The server's own IP: $DETECTED_IP"
echo "   - All router IPs from the database"
echo "   - Or use 0.0.0.0/0 to allow all (less secure)"
echo ""
echo "Run: sudo ./scripts/fix-radius-clients-config.sh"
echo "=================================================="
