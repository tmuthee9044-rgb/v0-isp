#!/bin/bash

# Quick FreeRADIUS health check

echo "FreeRADIUS Quick Health Check"
echo "=============================="
echo ""

# Check if service is running
echo "[1] Service Status:"
sudo systemctl status freeradius --no-pager || echo "Service not running"
echo ""

# Check listening ports
echo "[2] Listening Ports:"
sudo netstat -ulnp | grep -E '1812|1813' || sudo ss -ulnp | grep -E '1812|1813' || echo "No RADIUS ports listening"
echo ""

# Check recent logs
echo "[3] Recent Logs (last 20 lines):"
sudo journalctl -u freeradius -n 20 --no-pager
echo ""

# Check configuration syntax
echo "[4] Configuration Check:"
sudo freeradius -CX 2>&1 | head -20
echo ""

echo "=============================="
echo "End of health check"
