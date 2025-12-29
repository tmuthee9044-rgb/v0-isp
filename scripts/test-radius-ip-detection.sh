#!/bin/bash

# Test RADIUS IP Detection
# Validates that the system can detect a valid non-loopback IP

echo "========================================"
echo "RADIUS IP Detection Test"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo "⚠️  WARNING: Running as root is not required for this test"
  echo ""
fi

# Test 1: Check network interfaces
echo "Test 1: Network Interfaces"
echo "-------------------------------------------"
ip addr show 2>/dev/null || ifconfig 2>/dev/null
echo ""

# Test 2: Check default route
echo "Test 2: Default Route"
echo "-------------------------------------------"
ip route show default 2>/dev/null || route -n 2>/dev/null
echo ""

# Test 3: Check outbound interface
echo "Test 3: Outbound Interface Detection"
echo "-------------------------------------------"
ip route get 8.8.8.8 2>/dev/null || route get 8.8.8.8 2>/dev/null
echo ""

# Test 4: List all non-loopback IPs
echo "Test 4: Available Non-Loopback IPs"
echo "-------------------------------------------"
if command -v ip &> /dev/null; then
  ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '^127\.'
elif command -v ifconfig &> /dev/null; then
  ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}'
fi
echo ""

# Test 5: Check environment variable
echo "Test 5: RADIUS_IP Environment Variable"
echo "-------------------------------------------"
if [ -n "$RADIUS_IP" ]; then
  echo "✓ RADIUS_IP is set: $RADIUS_IP"
  
  # Validate it's not localhost
  if [[ "$RADIUS_IP" == "127."* ]] || [ "$RADIUS_IP" == "localhost" ]; then
    echo "✗ ERROR: RADIUS_IP is set to localhost!"
    echo "  This will prevent external routers from connecting."
  else
    echo "✓ RADIUS_IP is valid"
  fi
else
  echo "ℹ  RADIUS_IP not set (will use auto-detection)"
fi
echo ""

# Test 6: Check FreeRADIUS configuration
echo "Test 6: FreeRADIUS Listen Configuration"
echo "-------------------------------------------"
if [ -f "/etc/freeradius/3.0/sites-available/default" ]; then
  echo "Checking FreeRADIUS configuration..."
  LISTEN_IP=$(grep -A 5 "listen {" /etc/freeradius/3.0/sites-available/default | grep "ipaddr" | head -1 | awk '{print $3}')
  
  if [ "$LISTEN_IP" == "*" ] || [ "$LISTEN_IP" == "0.0.0.0" ]; then
    echo "✓ FreeRADIUS is configured to listen on all interfaces"
  elif [ "$LISTEN_IP" == "127.0.0.1" ] || [ "$LISTEN_IP" == "localhost" ]; then
    echo "✗ ERROR: FreeRADIUS is only listening on localhost!"
    echo "  Run: sudo ./scripts/fix-radius-network-complete.sh"
  else
    echo "ℹ  FreeRADIUS is listening on: $LISTEN_IP"
  fi
else
  echo "⚠️  FreeRADIUS configuration not found"
fi
echo ""

# Test 7: Check if RADIUS port is listening
echo "Test 7: RADIUS Port Status"
echo "-------------------------------------------"
if command -v netstat &> /dev/null; then
  netstat -ulnp 2>/dev/null | grep 1812 || echo "✗ Port 1812 not listening"
elif command -v ss &> /dev/null; then
  ss -ulnp 2>/dev/null | grep 1812 || echo "✗ Port 1812 not listening"
else
  echo "⚠️  Cannot check port status (netstat/ss not available)"
fi
echo ""

# Summary
echo "========================================"
echo "Summary"
echo "========================================"
echo ""
echo "✓ Test complete"
echo ""
echo "Next steps:"
echo "1. If no valid IP was detected, check your network configuration"
echo "2. If FreeRADIUS is listening on 127.0.0.1, run: sudo ./scripts/fix-radius-network-complete.sh"
echo "3. Test RADIUS from web interface: /settings/servers"
echo ""
