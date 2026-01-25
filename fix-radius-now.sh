#!/bin/bash
# Quick FreeRADIUS Fix - Run this to solve the startup issue

echo "FreeRADIUS Quick Fix Starting..."
echo "======================================"

# Make the comprehensive fix script executable
chmod +x /workspaces/isp-system/scripts/fix-freeradius-startup.sh

# Run the fix script
sudo /workspaces/isp-system/scripts/fix-freeradius-startup.sh

echo ""
echo "======================================"
echo "Fix script completed!"
echo ""
echo "If FreeRADIUS is still not running, check:"
echo "  sudo journalctl -xeu freeradius.service"
echo "  sudo freeradius -X"
