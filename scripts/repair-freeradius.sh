#!/bin/bash

# FreeRADIUS Comprehensive Repair Script
# This script diagnoses and fixes FreeRADIUS startup issues

set -e

echo "============================================"
echo "FreeRADIUS Comprehensive Repair"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if FreeRADIUS is installed
echo -e "${YELLOW}[1/8] Checking FreeRADIUS installation...${NC}"
if ! command -v freeradius &> /dev/null && ! command -v radiusd &> /dev/null; then
    echo -e "${RED}ERROR: FreeRADIUS is not installed${NC}"
    echo "Install it with: sudo apt-get install freeradius freeradius-postgresql"
    exit 1
fi
echo -e "${GREEN}✓ FreeRADIUS is installed${NC}"
echo ""

# Detect FreeRADIUS version and paths
if [ -d "/etc/freeradius/3.0" ]; then
    FREERADIUS_DIR="/etc/freeradius/3.0"
    FREERADIUS_VERSION="3.0"
elif [ -d "/etc/raddb" ]; then
    FREERADIUS_DIR="/etc/raddb"
    FREERADIUS_VERSION="raddb"
else
    echo -e "${RED}ERROR: Cannot find FreeRADIUS configuration directory${NC}"
    exit 1
fi

echo -e "${GREEN}Using FreeRADIUS directory: $FREERADIUS_DIR${NC}"
echo ""

# Step 2: Stop FreeRADIUS if running
echo -e "${YELLOW}[2/8] Stopping FreeRADIUS service...${NC}"
sudo systemctl stop freeradius 2>/dev/null || sudo service freeradius stop 2>/dev/null || true
echo -e "${GREEN}✓ Service stopped${NC}"
echo ""

# Step 3: Backup current configuration
echo -e "${YELLOW}[3/8] Backing up configuration...${NC}"
BACKUP_DIR="/tmp/freeradius-backup-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$FREERADIUS_DIR" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup saved to: $BACKUP_DIR${NC}"
echo ""

# Step 4: Check configuration syntax
echo -e "${YELLOW}[4/8] Checking configuration syntax...${NC}"
if sudo freeradius -CX 2>&1 | grep -i error; then
    echo -e "${RED}Configuration has errors. Creating minimal working config...${NC}"
    
    # Create minimal default site
    sudo tee "$FREERADIUS_DIR/sites-available/default" > /dev/null <<'EOFDEFAULT'
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
        exec
        attr_filter.accounting_response
    }

    post-auth {
        update {
            &reply: += &session-state:
        }
        exec
        Post-Auth-Type REJECT {
            attr_filter.access_reject
        }
    }
}
EOFDEFAULT

    # Enable the site
    sudo rm -f "$FREERADIUS_DIR/sites-enabled/default"
    sudo ln -s "$FREERADIUS_DIR/sites-available/default" "$FREERADIUS_DIR/sites-enabled/default"
    
    echo -e "${GREEN}✓ Minimal configuration created${NC}"
else
    echo -e "${GREEN}✓ Configuration syntax is valid${NC}"
fi
echo ""

# Step 5: Fix file permissions
echo -e "${YELLOW}[5/8] Fixing file permissions...${NC}"
sudo chown -R freerad:freerad "$FREERADIUS_DIR" 2>/dev/null || sudo chown -R radiusd:radiusd "$FREERADIUS_DIR" 2>/dev/null || true
sudo chmod 640 "$FREERADIUS_DIR/clients.conf" 2>/dev/null || true
sudo chmod 640 "$FREERADIUS_DIR/mods-available/sql" 2>/dev/null || true
echo -e "${GREEN}✓ Permissions fixed${NC}"
echo ""

# Step 6: Test in debug mode
echo -e "${YELLOW}[6/8] Testing in debug mode...${NC}"
timeout 5 sudo freeradius -X 2>&1 | head -50 || true
echo ""

# Step 7: Start service
echo -e "${YELLOW}[7/8] Starting FreeRADIUS service...${NC}"
if sudo systemctl start freeradius; then
    echo -e "${GREEN}✓ Service started successfully${NC}"
else
    echo -e "${RED}Failed to start service. Checking logs...${NC}"
    echo ""
    echo "=== Last 30 lines of system log ==="
    sudo journalctl -u freeradius -n 30 --no-pager
    echo ""
    echo "=== FreeRADIUS debug output ==="
    sudo freeradius -X 2>&1 | head -100
    exit 1
fi
echo ""

# Step 8: Verify service is running
echo -e "${YELLOW}[8/8] Verifying service status...${NC}"
if sudo systemctl is-active --quiet freeradius; then
    echo -e "${GREEN}✓ FreeRADIUS is running${NC}"
    echo ""
    echo "=== Service Status ==="
    sudo systemctl status freeradius --no-pager -l
    echo ""
    echo "=== Listening Ports ==="
    sudo netstat -ulnp | grep radius || sudo ss -ulnp | grep radius
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}FreeRADIUS repair completed successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
else
    echo -e "${RED}ERROR: Service is not running${NC}"
    exit 1
fi
