#!/bin/bash

# Fix FreeRADIUS to listen on all network interfaces instead of just localhost
# This allows external devices and routers to connect to RADIUS for authentication

set -e

echo "========================================"
echo "  FreeRADIUS Network Configuration Fix"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

# Detect FreeRADIUS version and config directory
if [ -d "/etc/freeradius/3.0" ]; then
    RADIUS_DIR="/etc/freeradius/3.0"
elif [ -d "/etc/freeradius" ]; then
    RADIUS_DIR="/etc/freeradius"
else
    echo "ERROR: FreeRADIUS configuration directory not found"
    exit 1
fi

echo "[1/6] Found FreeRADIUS config at: $RADIUS_DIR"

# Backup existing configurations
BACKUP_DIR="/root/freeradius-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "[2/6] Creating backup at: $BACKUP_DIR"

cp "$RADIUS_DIR/sites-available/default" "$BACKUP_DIR/default.bak" 2>/dev/null || true
cp "$RADIUS_DIR/sites-available/inner-tunnel" "$BACKUP_DIR/inner-tunnel.bak" 2>/dev/null || true
cp "$RADIUS_DIR/radiusd.conf" "$BACKUP_DIR/radiusd.conf.bak" 2>/dev/null || true

# Configure default site to listen on all interfaces
echo "[3/6] Configuring default site..."
cat > "$RADIUS_DIR/sites-available/default" << 'EOF_DEFAULT'
server default {
    listen {
        type = auth
        ipaddr = *
        port = 1812
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    listen {
        ipaddr = *
        port = 1813
        type = acct
        limit {
        }
    }

    authorize {
        filter_username
        preprocess
        sql
        pap
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
    }

    accounting {
        sql
    }

    session {
        sql
    }

    post-auth {
        sql
        Post-Auth-Type REJECT {
            sql
        }
    }

    pre-proxy {
    }

    post-proxy {
    }
}
EOF_DEFAULT

# Configure inner-tunnel to listen on localhost only
echo "[4/6] Configuring inner-tunnel..."
cat > "$RADIUS_DIR/sites-available/inner-tunnel" << 'EOF_INNER'
server inner-tunnel {
    listen {
        ipaddr = 127.0.0.1
        port = 18120
        type = auth
    }

    authorize {
        filter_username
        sql
        pap
    }

    authenticate {
        Auth-Type PAP {
            pap
        }
    }

    session {
        sql
    }

    post-auth {
        sql
    }
}
EOF_INNER

# Check firewall and open ports
echo "[5/6] Checking firewall configuration..."

# For UFW
if command -v ufw &> /dev/null; then
    echo "  - Configuring UFW firewall..."
    ufw allow 1812/udp comment "FreeRADIUS Authentication" 2>/dev/null || true
    ufw allow 1813/udp comment "FreeRADIUS Accounting" 2>/dev/null || true
fi

# For firewalld
if command -v firewall-cmd &> /dev/null; then
    echo "  - Configuring firewalld..."
    firewall-cmd --permanent --add-port=1812/udp 2>/dev/null || true
    firewall-cmd --permanent --add-port=1813/udp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

# Restart FreeRADIUS
echo "[6/6] Restarting FreeRADIUS..."
systemctl restart freeradius || service freeradius restart

# Wait for service to start
sleep 2

# Verify FreeRADIUS is running
if systemctl is-active --quiet freeradius || service freeradius status | grep -q "running"; then
    echo ""
    echo "✅ SUCCESS! FreeRADIUS is now running"
else
    echo ""
    echo "❌ WARNING: FreeRADIUS may not have started correctly"
    echo "   Check logs: journalctl -u freeradius -n 50"
fi

# Show listening ports
echo ""
echo "=========================================="
echo "  Verification"
echo "=========================================="
echo ""
echo "FreeRADIUS should now be listening on:"
netstat -tuln | grep ":1812\|:1813" || ss -tuln | grep ":1812\|:1813"
echo ""
echo "If you see '0.0.0.0:1812' or '*:1812', RADIUS is accessible on all network interfaces ✅"
echo "If you see '127.0.0.1:1812', RADIUS is still localhost-only ❌"
echo ""
echo "Next steps:"
echo "1. Go to /settings/servers in the web interface"
echo "2. Click 'Test Connection' under RADIUS Configuration"
echo "3. The test should now succeed"
echo ""
