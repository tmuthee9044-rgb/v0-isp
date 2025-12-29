#!/bin/bash

# Fix FreeRADIUS Startup Issues
# This script fixes common FreeRADIUS startup problems

set -e

echo "========================================"
echo "FreeRADIUS Startup Fix"
echo "========================================"
echo ""

# Stop FreeRADIUS if running
echo "[1] Stopping FreeRADIUS..."
sudo systemctl stop freeradius 2>/dev/null || true
echo ""

# Detect network IP
echo "[2] Detecting network IP..."
RADIUS_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[^ ]+' || echo "")
if [ -z "$RADIUS_IP" ] || [ "$RADIUS_IP" = "127.0.0.1" ]; then
    RADIUS_IP=$(hostname -I | awk '{print $1}')
fi
echo "Detected IP: $RADIUS_IP"
echo ""

# Create a minimal working configuration
echo "[3] Creating minimal working configuration..."
sudo tee /etc/freeradius/3.0/sites-available/default > /dev/null <<EOF
server default {
    listen {
        type = auth
        ipaddr = 0.0.0.0
        port = 1812
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    listen {
        type = acct
        ipaddr = 0.0.0.0
        port = 1813
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    authorize {
        filter_username
        preprocess
        suffix
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
        suffix
        files
    }

    accounting {
        detail
        unix
        exec
        attr_filter.accounting_response
    }

    session {
    }

    post-auth {
        update {
            &reply: += &session-state:
        }
        exec
        remove_reply_message_if_eap
    }

    pre-proxy {
    }

    post-proxy {
        eap
    }
}
EOF

# Enable the site
sudo ln -sf /etc/freeradius/3.0/sites-available/default /etc/freeradius/3.0/sites-enabled/default

echo "✓ Created minimal configuration"
echo ""

# Set correct permissions
echo "[4] Setting file permissions..."
sudo chown -R freerad:freerad /etc/freeradius/3.0/
sudo chmod 640 /etc/freeradius/3.0/sites-available/default
echo "✓ Permissions set"
echo ""

# Test configuration
echo "[5] Testing configuration..."
sudo freeradius -C
if [ $? -eq 0 ]; then
    echo "✓ Configuration is valid"
else
    echo "❌ Configuration still has errors"
    exit 1
fi
echo ""

# Start FreeRADIUS
echo "[6] Starting FreeRADIUS..."
sudo systemctl start freeradius
sleep 2

if systemctl is-active --quiet freeradius; then
    echo "✓ FreeRADIUS started successfully"
else
    echo "❌ FreeRADIUS failed to start"
    echo "Checking logs..."
    sudo journalctl -u freeradius.service -n 20 --no-pager
    exit 1
fi
echo ""

# Verify it's listening on the network
echo "[7] Verifying network listening..."
sudo netstat -ulnp | grep 1812 || sudo ss -ulnp | grep 1812
echo ""

echo "========================================"
echo "✓ FreeRADIUS is now running"
echo "========================================"
echo "Server IP: $RADIUS_IP"
echo "Auth Port: 1812"
echo "Acct Port: 1813"
echo ""
echo "Test from /settings/servers in the app"
