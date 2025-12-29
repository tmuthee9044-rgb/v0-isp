#!/bin/bash

# Fix RADIUS Listen Address and Update Database
# This script ensures FreeRADIUS listens on all interfaces and updates the database

set -e

echo "========================================"
echo "  Fix RADIUS Configuration"
echo "========================================"
echo ""

# Detect host IP
detect_host_ip() {
    local host_ip=""
    
    # Try common interface names in priority order
    for iface in eth0 ens0 ens3 ens33 ens160 en0 en1; do
        if ip addr show "$iface" &>/dev/null; then
            host_ip=$(ip addr show "$iface" | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
            if [ -n "$host_ip" ] && [ "$host_ip" != "127.0.0.1" ]; then
                echo "[INFO] Detected IP $host_ip on interface $iface"
                break
            fi
        fi
    done
    
    # Fallback: get any non-loopback IPv4
    if [ -z "$host_ip" ]; then
        host_ip=$(hostname -I | awk '{print $1}')
    fi
    
    echo "$host_ip"
}

HOST_IP=$(detect_host_ip)

if [ -z "$HOST_IP" ] || [ "$HOST_IP" == "127.0.0.1" ]; then
    echo "[ERROR] Could not detect a valid network IP address"
    echo "[ERROR] Please configure your network interface first"
    exit 1
fi

echo "[OK] Detected host IP: $HOST_IP"
echo ""

# Fix FreeRADIUS listen addresses
echo "[INFO] Configuring FreeRADIUS to listen on all interfaces..."

if [ -f /etc/freeradius/3.0/sites-available/default ]; then
    RADIUS_CONFIG="/etc/freeradius/3.0"
elif [ -f /etc/raddb/sites-available/default ]; then
    RADIUS_CONFIG="/etc/raddb"
else
    echo "[ERROR] FreeRADIUS configuration directory not found"
    exit 1
fi

# Update default site
sudo sed -i 's/ipaddr = 127\.0\.0\.1/ipaddr = */g' "$RADIUS_CONFIG/sites-available/default"
sudo sed -i 's/ipaddr = localhost/ipaddr = */g' "$RADIUS_CONFIG/sites-available/default"

# Update inner-tunnel site
sudo sed -i 's/ipaddr = 127\.0\.0\.1/ipaddr = */g' "$RADIUS_CONFIG/sites-available/inner-tunnel"
sudo sed -i 's/ipaddr = localhost/ipaddr = */g' "$RADIUS_CONFIG/sites-available/inner-tunnel"

echo "[OK] FreeRADIUS configured to listen on all interfaces (0.0.0.0)"

# Restart FreeRADIUS
echo "[INFO] Restarting FreeRADIUS..."
if systemctl is-active --quiet freeradius; then
    sudo systemctl restart freeradius
    sleep 2
    if systemctl is-active --quiet freeradius; then
        echo "[OK] FreeRADIUS restarted successfully"
    else
        echo "[ERROR] FreeRADIUS failed to restart"
        sudo journalctl -u freeradius -n 50 --no-pager
        exit 1
    fi
else
    sudo systemctl start freeradius
    sleep 2
    if systemctl is-active --quiet freeradius; then
        echo "[OK] FreeRADIUS started successfully"
    else
        echo "[ERROR] FreeRADIUS failed to start"
        sudo journalctl -u freeradius -n 50 --no-pager
        exit 1
    fi
fi

# Verify RADIUS is listening on the correct port and IP
echo ""
echo "[INFO] Verifying RADIUS is listening on port 1812..."
if sudo ss -ulpn | grep -q ":1812"; then
    echo "[OK] RADIUS is listening on port 1812"
    sudo ss -ulpn | grep ":1812"
else
    echo "[WARNING] RADIUS might not be listening on port 1812"
    echo "Run: sudo ss -ulpn | grep freeradius"
fi

# Update database with correct host IP
echo ""
echo "[INFO] Updating database with detected IP: $HOST_IP"

# Use psql to update the database
PGPASSWORD="${POSTGRES_PASSWORD:-password}" psql -h "${PGHOST:-localhost}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DATABASE:-isp_db}" <<EOF
-- Update RADIUS host in system_config
INSERT INTO system_config (key, value, updated_at)
VALUES ('server.radius.host', '"$HOST_IP"', NOW())
ON CONFLICT (key) 
DO UPDATE SET value = '"$HOST_IP"', updated_at = NOW();

-- Show the updated value
SELECT key, value FROM system_config WHERE key = 'server.radius.host';
EOF

echo ""
echo "========================================"
echo "  Configuration Summary"
echo "========================================"
echo "RADIUS Host IP: $HOST_IP"
echo "RADIUS Listen:  * (all interfaces / 0.0.0.0)"
echo "RADIUS Port:    1812 (auth), 1813 (acct)"
echo ""
echo "Test RADIUS from this machine:"
echo "  radtest test test $HOST_IP 1812 testing123"
echo ""
echo "Test RADIUS from remote machine:"
echo "  radtest test test $HOST_IP 1812 <your-shared-secret>"
echo "========================================"
