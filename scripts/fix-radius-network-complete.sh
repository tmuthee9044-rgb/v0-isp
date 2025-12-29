#!/bin/bash

set -e

echo "=========================================="
echo "FreeRADIUS Network Configuration Fix"
echo "=========================================="
echo ""

# Detect network IP
detect_network_ip() {
    local ip=""
    
    # Try multiple methods to detect IP
    for interface in ens160 eth0 ens33 enp0s3 enp0s8; do
        ip=$(ip addr show $interface 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
        if [ ! -z "$ip" ] && [ "$ip" != "127.0.0.1" ]; then
            echo "[INFO] Detected IP: $ip on interface $interface"
            echo "$ip"
            return 0
        fi
    done
    
    # Fallback: get default route IP
    ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+')
    if [ ! -z "$ip" ] && [ "$ip" != "127.0.0.1" ]; then
        echo "[INFO] Detected IP: $ip from default route"
        echo "$ip"
        return 0
    fi
    
    echo "[ERROR] Could not detect network IP" >&2
    return 1
}

NETWORK_IP=$(detect_network_ip)
if [ -z "$NETWORK_IP" ]; then
    echo "[ERROR] Failed to detect network IP address"
    exit 1
fi

echo ""
echo "Detected Network IP: $NETWORK_IP"
echo ""

# Check if FreeRADIUS is installed
if ! command -v freeradius &> /dev/null && ! command -v radiusd &> /dev/null; then
    echo "[ERROR] FreeRADIUS is not installed"
    echo "Please run the main install.sh script first"
    exit 1
fi

# Detect FreeRADIUS version and paths
if [ -d "/etc/freeradius/3.0" ]; then
    RADIUS_DIR="/etc/freeradius/3.0"
    RADIUS_SERVICE="freeradius"
elif [ -d "/etc/raddb" ]; then
    RADIUS_DIR="/etc/raddb"
    RADIUS_SERVICE="radiusd"
else
    echo "[ERROR] Could not find FreeRADIUS configuration directory"
    exit 1
fi

echo "[INFO] FreeRADIUS directory: $RADIUS_DIR"
echo ""

# Stop FreeRADIUS
echo "[1/6] Stopping FreeRADIUS..."
systemctl stop $RADIUS_SERVICE 2>/dev/null || service $RADIUS_SERVICE stop 2>/dev/null || true
sleep 2

# Backup configurations
echo "[2/6] Backing up configurations..."
cp $RADIUS_DIR/sites-available/default $RADIUS_DIR/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp $RADIUS_DIR/sites-available/inner-tunnel $RADIUS_DIR/sites-available/inner-tunnel.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Configure default site to listen on all interfaces
echo "[3/6] Configuring default site..."
cat > $RADIUS_DIR/sites-available/default <<'DEFAULTEOF'
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
        sql
        pap
    }
    
    authenticate {
        Auth-Type PAP {
            pap
        }
        Auth-Type MS-CHAP {
            mschap
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
    
    post-auth {
        sql
        Post-Auth-Type REJECT {
            sql
        }
    }
}
DEFAULTEOF

# Configure inner-tunnel to listen on all interfaces
echo "[4/6] Configuring inner-tunnel..."
cat > $RADIUS_DIR/sites-available/inner-tunnel <<'INNEREOF'
server inner-tunnel {
    listen {
        ipaddr = 0.0.0.0
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
    
    post-auth {
        sql
    }
}
INNEREOF

# Open firewall ports
echo "[5/6] Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 1812/udp comment "FreeRADIUS Auth" 2>/dev/null || true
    ufw allow 1813/udp comment "FreeRADIUS Acct" 2>/dev/null || true
    echo "    - UFW rules added"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=1812/udp 2>/dev/null || true
    firewall-cmd --permanent --add-port=1813/udp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "    - firewalld rules added"
else
    echo "    - No firewall detected (ufw/firewalld)"
fi

# Start FreeRADIUS
echo "[6/6] Starting FreeRADIUS..."
systemctl start $RADIUS_SERVICE || service $RADIUS_SERVICE start
sleep 3

# Verify it's running
if systemctl is-active --quiet $RADIUS_SERVICE 2>/dev/null || service $RADIUS_SERVICE status >/dev/null 2>&1; then
    echo ""
    echo "=========================================="
    echo "✓ FreeRADIUS Configuration Complete"
    echo "=========================================="
    echo ""
    echo "Listening Status:"
    netstat -ulnp 2>/dev/null | grep -E "1812|1813" || ss -ulnp | grep -E "1812|1813" || echo "Unable to check (netstat/ss not available)"
    echo ""
    echo "Network IP: $NETWORK_IP"
    echo ""
    echo "Next steps:"
    echo "1. Go to /settings/servers in your application"
    echo "2. Verify RADIUS host is set to: $NETWORK_IP"
    echo "3. Click 'Test Connection' to verify connectivity"
    echo ""
else
    echo ""
    echo "[ERROR] FreeRADIUS failed to start"
    echo "Check logs: journalctl -xeu $RADIUS_SERVICE"
    echo "Or: tail -f /var/log/freeradius/radius.log"
    exit 1
fi
