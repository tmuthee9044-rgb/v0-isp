#!/bin/bash

# Fix FreeRADIUS File Permissions Issue
# This script fixes the "Permission denied" error when FreeRADIUS tries to read its config files

set -e

echo "=========================================="
echo "FreeRADIUS Permissions Fix"
echo "=========================================="
echo ""

# Detect FreeRADIUS config path
if [ -d "/etc/freeradius/3.0" ]; then
    RADIUS_DIR="/etc/freeradius/3.0"
elif [ -d "/etc/raddb" ]; then
    RADIUS_DIR="/etc/raddb"
else
    echo "ERROR: FreeRADIUS config directory not found"
    exit 1
fi

echo "[1/6] Found FreeRADIUS config at: $RADIUS_DIR"

# Stop FreeRADIUS if running
echo "[2/6] Stopping FreeRADIUS service..."
systemctl stop freeradius 2>/dev/null || true

# Fix ownership - ensure freerad user owns the config files
echo "[3/6] Setting correct ownership (freerad:freerad)..."
chown -R freerad:freerad $RADIUS_DIR

# Fix directory permissions - directories need execute permission to be entered
echo "[4/6] Setting directory permissions (755)..."
find $RADIUS_DIR -type d -exec chmod 755 {} \;

# Fix file permissions - config files need read permission
echo "[5/6] Setting file permissions (644)..."
find $RADIUS_DIR -type f -exec chmod 644 {} \;

# Verify permissions
echo "[6/6] Verifying permissions..."
echo ""
echo "Directory permissions:"
ls -ld $RADIUS_DIR
echo ""
echo "Key file permissions:"
ls -l $RADIUS_DIR/radiusd.conf 2>/dev/null || echo "  radiusd.conf: NOT FOUND"
ls -l $RADIUS_DIR/clients.conf 2>/dev/null || echo "  clients.conf: NOT FOUND"
ls -l $RADIUS_DIR/mods-enabled/sql 2>/dev/null || echo "  sql module: NOT FOUND"

echo ""
echo "=========================================="
echo "Testing FreeRADIUS Configuration"
echo "=========================================="
echo ""

# Test configuration in debug mode
echo "Running: freeradius -XC (config test)..."
if freeradius -XC 2>&1 | tee /tmp/freeradius-test.log | tail -20; then
    echo ""
    echo "✓ Configuration test passed!"
else
    echo ""
    echo "✗ Configuration test failed. Check /tmp/freeradius-test.log for details"
    exit 1
fi

echo ""
echo "=========================================="
echo "Starting FreeRADIUS Service"
echo "=========================================="
echo ""

# Start FreeRADIUS
systemctl start freeradius

# Wait for startup
sleep 2

# Check status
if systemctl is-active --quiet freeradius; then
    echo "✓ FreeRADIUS service is running!"
    echo ""
    systemctl status freeradius --no-pager -l
    echo ""
    echo "Listening on:"
    netstat -ulnp | grep 1812 || echo "  WARNING: Not listening on port 1812"
else
    echo "✗ FreeRADIUS service failed to start"
    echo ""
    echo "Recent logs:"
    journalctl -u freeradius -n 50 --no-pager
    exit 1
fi

echo ""
echo "=========================================="
echo "Permissions Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test RADIUS connection in /settings/servers"
echo "2. Check that routers can authenticate"
