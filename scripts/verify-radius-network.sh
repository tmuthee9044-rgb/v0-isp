#!/bin/bash

echo "=========================================="
echo "FreeRADIUS Network Verification"
echo "=========================================="
echo ""

# Detect network IP
detect_network_ip() {
    for interface in ens160 eth0 ens33 enp0s3 enp0s8; do
        ip=$(ip addr show $interface 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
        if [ ! -z "$ip" ] && [ "$ip" != "127.0.0.1" ]; then
            echo "$ip"
            return 0
        fi
    done
    ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+'
}

NETWORK_IP=$(detect_network_ip)

echo "Network IP: $NETWORK_IP"
echo ""

# Check if RADIUS is running
echo "1. FreeRADIUS Service Status:"
systemctl status freeradius 2>/dev/null || systemctl status radiusd 2>/dev/null || service freeradius status || service radiusd status
echo ""

# Check listening ports
echo "2. Listening on Network Ports:"
netstat -ulnp 2>/dev/null | grep -E "1812|1813" || ss -ulnp | grep -E "1812|1813"
echo ""

# Check if listening on 0.0.0.0
if netstat -ulnp 2>/dev/null | grep "0.0.0.0:181[23]" || ss -ulnp 2>/dev/null | grep "0.0.0.0:181[23]"; then
    echo "✓ FreeRADIUS is listening on all interfaces (0.0.0.0)"
elif netstat -ulnp 2>/dev/null | grep "127.0.0.1:181[23]" || ss -ulnp 2>/dev/null | grep "127.0.0.1:181[23]"; then
    echo "✗ FreeRADIUS is only listening on localhost (127.0.0.1)"
    echo "  Run: sudo ./scripts/fix-radius-network-complete.sh"
else
    echo "? Unable to determine listening address"
fi
echo ""

# Test UDP connectivity
echo "3. Testing UDP Port Connectivity:"
if command -v nc &> /dev/null; then
    timeout 2 nc -u -z $NETWORK_IP 1812 && echo "✓ Port 1812 is reachable" || echo "✗ Port 1812 is NOT reachable"
else
    echo "  (netcat not available for testing)"
fi
echo ""

# Check firewall
echo "4. Firewall Status:"
if command -v ufw &> /dev/null; then
    ufw status | grep -E "1812|1813" || echo "  No RADIUS rules found in UFW"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --list-ports 2>/dev/null | grep -E "1812|1813" || echo "  No RADIUS rules found in firewalld"
else
    echo "  No firewall detected"
fi
