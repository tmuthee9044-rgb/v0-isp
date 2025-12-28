#!/bin/bash

# Fix FreeRADIUS to listen on all network interfaces instead of just 127.0.0.1
# This script can be run after installation if RADIUS is only accessible on localhost

set -e

echo "============================================"
echo "  Fix FreeRADIUS Listen Address"
echo "============================================"
echo ""

# Detect FreeRADIUS directory
if [ -d "/etc/freeradius/3.0" ]; then
    FREERADIUS_DIR="/etc/freeradius/3.0"
elif [ -d "/etc/freeradius" ]; then
    FREERADIUS_DIR="/etc/freeradius"
else
    echo "ERROR: FreeRADIUS configuration directory not found"
    exit 1
fi

echo "[INFO] Found FreeRADIUS at: $FREERADIUS_DIR"

# Backup and update radiusd.conf
echo "[INFO] Updating radiusd.conf..."
if [ -f "$FREERADIUS_DIR/radiusd.conf" ]; then
    sudo cp "$FREERADIUS_DIR/radiusd.conf" "$FREERADIUS_DIR/radiusd.conf.backup.$(date +%Y%m%d_%H%M%S)"
    sudo sed -i 's/ipaddr = 127.0.0.1/ipaddr = */g' "$FREERADIUS_DIR/radiusd.conf" 2>/dev/null || true
    sudo sed -i 's/ipaddr = ::1/ipaddr = ::/g' "$FREERADIUS_DIR/radiusd.conf" 2>/dev/null || true
    echo "[OK] Updated radiusd.conf"
fi

# Backup and update default site
echo "[INFO] Updating sites-available/default..."
if [ -f "$FREERADIUS_DIR/sites-available/default" ]; then
    sudo cp "$FREERADIUS_DIR/sites-available/default" "$FREERADIUS_DIR/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Replace all listen addresses with 0.0.0.0 (all interfaces)
    sudo sed -i 's/ipaddr = 127.0.0.1/ipaddr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/default"
    sudo sed -i 's/ipaddr = \*/ipaddr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/default"
    sudo sed -i 's/ipv4addr = 127.0.0.1/ipv4addr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/default"
    sudo sed -i 's/ipv4addr = \*/ipv4addr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/default"
    
    echo "[OK] Updated sites-available/default"
fi

# Backup and update inner-tunnel site
echo "[INFO] Updating sites-available/inner-tunnel..."
if [ -f "$FREERADIUS_DIR/sites-available/inner-tunnel" ]; then
    sudo cp "$FREERADIUS_DIR/sites-available/inner-tunnel" "$FREERADIUS_DIR/sites-available/inner-tunnel.backup.$(date +%Y%m%d_%H%M%S)"
    
    sudo sed -i 's/ipaddr = 127.0.0.1/ipaddr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/inner-tunnel"
    sudo sed -i 's/ipv4addr = 127.0.0.1/ipv4addr = 0.0.0.0/g' "$FREERADIUS_DIR/sites-available/inner-tunnel"
    
    echo "[OK] Updated sites-available/inner-tunnel"
fi

# Restart FreeRADIUS
echo ""
echo "[INFO] Restarting FreeRADIUS service..."
if sudo systemctl restart freeradius 2>/dev/null; then
    echo "[OK] FreeRADIUS restarted successfully"
elif sudo service freeradius restart 2>/dev/null; then
    echo "[OK] FreeRADIUS restarted successfully"
else
    echo "[WARNING] Could not restart FreeRADIUS automatically. Please restart manually:"
    echo "  sudo systemctl restart freeradius"
    echo "  OR"
    echo "  sudo service freeradius restart"
fi

echo ""
echo "============================================"
echo "  Verifying FreeRADIUS Listen Addresses"
echo "============================================"
echo ""

# Show what FreeRADIUS is listening on
echo "FreeRADIUS should now be listening on:"
sudo netstat -tulpn 2>/dev/null | grep radius || sudo ss -tulpn | grep radius || echo "[INFO] Could not determine listening ports"

echo ""
echo "[INFO] You can verify by running:"
echo "  sudo freeradius -X"
echo "Look for lines like: 'Listening on auth address * port 1812'"
echo ""
echo "[SUCCESS] FreeRADIUS listen address configuration complete!"
echo "The RADIUS server should now be accessible on all network interfaces."
