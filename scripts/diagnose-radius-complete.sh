#!/bin/bash

echo "=========================================="
echo "FreeRADIUS Complete Diagnostic"
echo "=========================================="
echo ""

# Detect primary network IP
PRIMARY_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[\d.]+' | head -1)
if [ -z "$PRIMARY_IP" ]; then
    PRIMARY_IP=$(hostname -I | awk '{print $1}')
fi

echo "1. Network Configuration"
echo "   Primary IP: $PRIMARY_IP"
echo ""

# Check if FreeRADIUS is installed
echo "2. FreeRADIUS Installation"
if command -v freeradius &> /dev/null; then
    echo "   ✓ FreeRADIUS is installed"
    RADIUS_VERSION=$(freeradius -v 2>&1 | head -1)
    echo "   Version: $RADIUS_VERSION"
else
    echo "   ✗ FreeRADIUS is NOT installed"
    echo "   Install with: sudo apt-get install freeradius freeradius-postgresql"
    exit 1
fi
echo ""

# Check if FreeRADIUS is running
echo "3. FreeRADIUS Service Status"
if systemctl is-active --quiet freeradius; then
    echo "   ✓ FreeRADIUS service is running"
else
    echo "   ✗ FreeRADIUS service is NOT running"
    echo "   Start with: sudo systemctl start freeradius"
fi
echo ""

# Check listening ports
echo "4. Network Listening Status"
RADIUS_LISTENING=$(sudo netstat -tulpn 2>/dev/null | grep ":1812" || sudo ss -tulpn 2>/dev/null | grep ":1812")
if [ -n "$RADIUS_LISTENING" ]; then
    echo "   ✓ Something is listening on port 1812:"
    echo "$RADIUS_LISTENING" | sed 's/^/     /'
    
    # Check if listening on all interfaces or just localhost
    if echo "$RADIUS_LISTENING" | grep -q "0.0.0.0:1812\|*:1812"; then
        echo "   ✓ Listening on ALL interfaces (0.0.0.0) - GOOD!"
    elif echo "$RADIUS_LISTENING" | grep -q "127.0.0.1:1812"; then
        echo "   ✗ Listening ONLY on localhost (127.0.0.1) - THIS IS THE PROBLEM!"
        echo "   RADIUS won't accept network connections from $PRIMARY_IP"
    fi
else
    echo "   ✗ Nothing is listening on port 1812"
fi
echo ""

# Check FreeRADIUS configuration
echo "5. FreeRADIUS Listen Configuration"
if [ -f /etc/freeradius/3.0/sites-enabled/default ]; then
    CONFIG_FILE="/etc/freeradius/3.0/sites-enabled/default"
elif [ -f /etc/freeradius/sites-enabled/default ]; then
    CONFIG_FILE="/etc/freeradius/sites-enabled/default"
else
    echo "   ✗ Cannot find FreeRADIUS default site config"
    CONFIG_FILE=""
fi

if [ -n "$CONFIG_FILE" ]; then
    echo "   Config file: $CONFIG_FILE"
    echo ""
    echo "   Listen sections:"
    sudo grep -A 5 "listen {" "$CONFIG_FILE" | grep -E "ipaddr|port" | sed 's/^/     /'
    
    # Check if ipaddr is set to localhost
    if sudo grep -A 5 "listen {" "$CONFIG_FILE" | grep -q "ipaddr.*=.*127.0.0.1"; then
        echo ""
        echo "   ✗ PROBLEM FOUND: ipaddr is set to 127.0.0.1"
        echo "   This prevents network access!"
    elif sudo grep -A 5 "listen {" "$CONFIG_FILE" | grep -q "ipaddr.*=.*\*"; then
        echo ""
        echo "   ✓ ipaddr is set to * (all interfaces) - GOOD!"
    fi
fi
echo ""

# Check firewall
echo "6. Firewall Status"
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
    echo "   UFW Firewall is active"
    if sudo ufw status | grep -q "1812"; then
        echo "   ✓ Port 1812 is allowed"
    else
        echo "   ✗ Port 1812 is NOT allowed"
        echo "   Allow with: sudo ufw allow 1812/udp"
    fi
elif command -v firewall-cmd &> /dev/null; then
    echo "   firewalld is installed"
    if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "1812"; then
        echo "   ✓ Port 1812 is allowed"
    else
        echo "   ✗ Port 1812 is NOT allowed"  
        echo "   Allow with: sudo firewall-cmd --add-port=1812/udp --permanent && sudo firewall-cmd --reload"
    fi
else
    echo "   No firewall detected or firewall is inactive"
fi
echo ""

# Test connectivity
echo "7. Testing RADIUS Connectivity"
echo "   Testing localhost (127.0.0.1)..."
if timeout 2 bash -c "echo 'test' | nc -u 127.0.0.1 1812" 2>/dev/null; then
    echo "   ✓ Can send UDP to localhost:1812"
else
    echo "   ? Cannot send UDP to localhost:1812 (may be normal)"
fi

echo "   Testing network IP ($PRIMARY_IP)..."
if timeout 2 bash -c "echo 'test' | nc -u $PRIMARY_IP 1812" 2>/dev/null; then
    echo "   ✓ Can send UDP to $PRIMARY_IP:1812"
else
    echo "   ✗ Cannot send UDP to $PRIMARY_IP:1812"
    echo "   This confirms RADIUS is NOT accessible on the network!"
fi
echo ""

# Summary
echo "=========================================="
echo "DIAGNOSIS SUMMARY"
echo "=========================================="
echo ""

if sudo netstat -tulpn 2>/dev/null | grep ":1812" | grep -q "127.0.0.1"; then
    echo "ROOT CAUSE: FreeRADIUS is only listening on localhost (127.0.0.1)"
    echo ""
    echo "FIX: Run the fix script to make it listen on all interfaces:"
    echo "  chmod +x scripts/fix-radius-network-listen.sh"
    echo "  sudo ./scripts/fix-radius-network-listen.sh"
elif ! systemctl is-active --quiet freeradius; then
    echo "ROOT CAUSE: FreeRADIUS service is not running"
    echo ""
    echo "FIX:"
    echo "  sudo systemctl start freeradius"
    echo "  sudo systemctl enable freeradius"
else
    echo "FreeRADIUS appears to be configured correctly"
    echo "Check application logs for other issues"
fi
