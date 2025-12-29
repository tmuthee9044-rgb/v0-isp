#!/bin/bash

# Debug script to diagnose RADIUS network connectivity issues

echo "========================================"
echo "  FreeRADIUS Network Diagnostics"
echo "========================================"
echo ""

# Check if FreeRADIUS is installed
if ! command -v freeradius &> /dev/null && ! command -v radiusd &> /dev/null; then
    echo "❌ FreeRADIUS is NOT installed"
    exit 1
fi
echo "✅ FreeRADIUS is installed"

# Check if FreeRADIUS is running
if systemctl is-active --quiet freeradius 2>/dev/null || service freeradius status 2>/dev/null | grep -q "running"; then
    echo "✅ FreeRADIUS service is running"
else
    echo "❌ FreeRADIUS service is NOT running"
    echo "   Start it with: sudo systemctl start freeradius"
fi

# Check what ports FreeRADIUS is listening on
echo ""
echo "=========================================="
echo "  Listening Ports"
echo "=========================================="
echo ""
if command -v netstat &> /dev/null; then
    netstat -tuln | grep ":1812\|:1813"
elif command -v ss &> /dev/null; then
    ss -tuln | grep ":1812\|:1813"
else
    echo "Neither netstat nor ss available"
fi

# Check network interfaces
echo ""
echo "=========================================="
echo "  Network Interfaces"
echo "=========================================="
echo ""
ip -4 addr show | grep -E "inet |^[0-9]"

# Check firewall status
echo ""
echo "=========================================="
echo "  Firewall Status"
echo "=========================================="
echo ""

if command -v ufw &> /dev/null; then
    echo "UFW Status:"
    sudo ufw status | grep -E "1812|1813|Status"
fi

if command -v firewall-cmd &> /dev/null; then
    echo "Firewalld Status:"
    sudo firewall-cmd --list-ports | grep -E "1812|1813" || echo "  No RADIUS ports open"
fi

# Test local connectivity
echo ""
echo "=========================================="
echo "  Local Connectivity Test"
echo "=========================================="
echo ""
if command -v nc &> /dev/null; then
    echo "Testing localhost:1812..."
    timeout 2 nc -u -v 127.0.0.1 1812 < /dev/null 2>&1 | head -n 1
    
    # Get primary IP
    PRIMARY_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v "127.0.0.1" | head -n 1)
    if [ -n "$PRIMARY_IP" ]; then
        echo "Testing $PRIMARY_IP:1812..."
        timeout 2 nc -u -v $PRIMARY_IP 1812 < /dev/null 2>&1 | head -n 1
    fi
else
    echo "netcat (nc) not available for testing"
fi

echo ""
echo "=========================================="
echo "  Recommendations"
echo "=========================================="
echo ""
echo "If RADIUS is only listening on 127.0.0.1:"
echo "  → Run: sudo chmod +x scripts/fix-radius-network-listen.sh"
echo "  → Then: sudo ./scripts/fix-radius-network-listen.sh"
echo ""
echo "If firewall is blocking:"
echo "  → UFW: sudo ufw allow 1812/udp && sudo ufw allow 1813/udp"
echo "  → Firewalld: sudo firewall-cmd --add-port=1812/udp --permanent && sudo firewall-cmd --reload"
echo ""
