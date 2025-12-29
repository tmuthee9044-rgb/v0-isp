#!/bin/bash

# Diagnose FreeRADIUS Startup Issues
# This script identifies why FreeRADIUS won't start

echo "========================================"
echo "FreeRADIUS Startup Diagnostics"
echo "========================================"
echo ""

# Check if FreeRADIUS is installed
echo "[1] Checking FreeRADIUS installation..."
if ! command -v freeradius &> /dev/null; then
    echo "❌ FreeRADIUS is not installed"
    exit 1
fi
echo "✓ FreeRADIUS is installed"
echo ""

# Check configuration syntax
echo "[2] Testing configuration syntax..."
sudo freeradius -C
CONFIG_TEST=$?
if [ $CONFIG_TEST -ne 0 ]; then
    echo "❌ Configuration has syntax errors (see above)"
    echo ""
    echo "Common fixes:"
    echo "  - Check for missing semicolons or braces"
    echo "  - Verify SQL module is configured"
    echo "  - Check file permissions"
else
    echo "✓ Configuration syntax is valid"
fi
echo ""

# Show detailed error logs
echo "[3] Recent error logs..."
sudo journalctl -u freeradius.service -n 50 --no-pager
echo ""

# Check file permissions
echo "[4] Checking file permissions..."
sudo ls -la /etc/freeradius/3.0/sites-available/default
sudo ls -la /etc/freeradius/3.0/mods-enabled/sql
echo ""

# Check if SQL module is configured
echo "[5] Checking SQL module..."
if [ -f /etc/freeradius/3.0/mods-enabled/sql ]; then
    echo "✓ SQL module is enabled"
    echo "SQL configuration:"
    sudo grep -A 5 "driver =" /etc/freeradius/3.0/mods-enabled/sql 2>/dev/null || echo "Could not read SQL config"
else
    echo "❌ SQL module is not enabled"
fi
echo ""

# Check database connectivity
echo "[6] Checking PostgreSQL connectivity..."
if systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
fi
echo ""

# Provide fix recommendations
echo "========================================"
echo "Recommended Actions:"
echo "========================================"
echo "Run: sudo ./scripts/fix-freeradius-startup.sh"
echo ""
