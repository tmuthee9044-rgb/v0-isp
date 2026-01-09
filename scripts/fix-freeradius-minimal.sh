#!/bin/bash

# FreeRADIUS Minimal Fix Script
# This creates a minimal working FreeRADIUS configuration

set -e

echo "=================================="
echo "FreeRADIUS Minimal Configuration"
echo "=================================="
echo ""

# Find FreeRADIUS config directory
if [ -d "/etc/freeradius/3.0" ]; then
    FREERADIUS_DIR="/etc/freeradius/3.0"
elif [ -d "/etc/raddb" ]; then
    FREERADIUS_DIR="/etc/raddb"
elif [ -d "/etc/freeradius" ]; then
    FREERADIUS_DIR="/etc/freeradius"
else
    echo "ERROR: FreeRADIUS config directory not found"
    exit 1
fi

echo "Using FreeRADIUS directory: $FREERADIUS_DIR"

# Stop FreeRADIUS
echo "Stopping FreeRADIUS..."
sudo systemctl stop freeradius || true

# Backup existing config
echo "Backing up existing configuration..."
sudo cp -r "$FREERADIUS_DIR" "${FREERADIUS_DIR}.backup.$(date +%Y%m%d_%H%M%S)" || true

# Create minimal sites-available/default
echo "Creating minimal default site configuration..."
sudo tee "$FREERADIUS_DIR/sites-available/default" > /dev/null <<'EOF'
server default {
    listen {
        type = auth
        ipaddr = 0.0.0.0
        port = 1812
    }
    
    listen {
        type = acct
        ipaddr = 0.0.0.0
        port = 1813
    }
    
    authorize {
        filter_username
        preprocess
        files
    }
    
    authenticate {
        Auth-Type PAP {
            pap
        }
    }
    
    preacct {
        preprocess
        acct_unique
    }
    
    accounting {
        detail
        unix
    }
    
    post-auth {
        update {
            &reply: += &session-state:
        }
        
        Post-Auth-Type REJECT {
            attr_filter.access_reject
        }
    }
}
EOF

# Enable the default site
echo "Enabling default site..."
sudo ln -sf ../sites-available/default "$FREERADIUS_DIR/sites-enabled/default" || true

# Disable inner-tunnel if it exists
if [ -f "$FREERADIUS_DIR/sites-enabled/inner-tunnel" ]; then
    echo "Disabling inner-tunnel..."
    sudo rm -f "$FREERADIUS_DIR/sites-enabled/inner-tunnel"
fi

# Set proper permissions
echo "Setting permissions..."
sudo chown -R freerad:freerad "$FREERADIUS_DIR" 2>/dev/null || sudo chown -R radiusd:radiusd "$FREERADIUS_DIR" 2>/dev/null || true
sudo chmod 640 "$FREERADIUS_DIR/clients.conf"

# Test configuration
echo "Testing configuration..."
if command -v freeradius &> /dev/null; then
    RADIUS_CMD="freeradius"
else
    RADIUS_CMD="radiusd"
fi

if sudo $RADIUS_CMD -CX; then
    echo "✓ Configuration is valid"
else
    echo "✗ Configuration has errors"
    exit 1
fi

# Start FreeRADIUS
echo "Starting FreeRADIUS..."
sudo systemctl start freeradius

# Wait a moment
sleep 2

# Check status
if sudo systemctl is-active --quiet freeradius; then
    echo "✓ FreeRADIUS is running"
    
    # Check if listening on ports
    if sudo netstat -ulnp 2>/dev/null | grep -E ":(1812|1813)" | grep -q freeradius || sudo netstat -ulnp 2>/dev/null | grep -E ":(1812|1813)" | grep -q radiusd; then
        echo "✓ FreeRADIUS is listening on ports 1812 and 1813"
        echo ""
        sudo netstat -ulnp | grep -E ":(1812|1813)"
    else
        echo "⚠ FreeRADIUS is running but not listening on expected ports"
    fi
else
    echo "✗ FreeRADIUS failed to start"
    echo "Check logs: sudo journalctl -xeu freeradius.service"
    exit 1
fi

echo ""
echo "=================================="
echo "FreeRADIUS Configuration Complete"
echo "=================================="
