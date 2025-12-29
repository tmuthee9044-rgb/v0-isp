#!/bin/bash

# FreeRADIUS Diagnostic Script
# This script diagnoses why FreeRADIUS won't start

set -e

echo "=================================="
echo "FreeRADIUS Diagnostic Tool"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find FreeRADIUS config directory
if [ -d "/etc/freeradius/3.0" ]; then
    FREERADIUS_DIR="/etc/freeradius/3.0"
elif [ -d "/etc/raddb" ]; then
    FREERADIUS_DIR="/etc/raddb"
elif [ -d "/etc/freeradius" ]; then
    FREERADIUS_DIR="/etc/freeradius"
else
    echo -e "${RED}✗ FreeRADIUS config directory not found${NC}"
    exit 1
fi

echo "Using FreeRADIUS directory: $FREERADIUS_DIR"
echo ""

# Step 1: Check if FreeRADIUS is installed
echo "Step 1: Checking FreeRADIUS installation..."
if command -v freeradius &> /dev/null || command -v radiusd &> /dev/null; then
    echo -e "${GREEN}✓ FreeRADIUS is installed${NC}"
    if command -v freeradius &> /dev/null; then
        freeradius -v | head -1
    else
        radiusd -v | head -1
    fi
else
    echo -e "${RED}✗ FreeRADIUS is not installed${NC}"
    exit 1
fi
echo ""

# Step 2: Check configuration syntax
echo "Step 2: Testing configuration syntax..."
if command -v freeradius &> /dev/null; then
    RADIUS_CMD="freeradius"
else
    RADIUS_CMD="radiusd"
fi

if sudo $RADIUS_CMD -CX 2>&1 | grep -q "Configuration appears to be OK"; then
    echo -e "${GREEN}✓ Configuration syntax is valid${NC}"
else
    echo -e "${RED}✗ Configuration has errors:${NC}"
    sudo $RADIUS_CMD -CX 2>&1 | tail -20
fi
echo ""

# Step 3: Check service status
echo "Step 3: Checking service status..."
sudo systemctl status freeradius.service --no-pager || true
echo ""

# Step 4: Check recent logs
echo "Step 4: Checking recent error logs..."
echo -e "${YELLOW}Last 30 lines from journal:${NC}"
sudo journalctl -xeu freeradius.service -n 30 --no-pager || true
echo ""

# Step 5: Check ports
echo "Step 5: Checking if ports 1812/1813 are in use..."
if sudo netstat -ulnp 2>/dev/null | grep -E ":(1812|1813)" | grep -v freeradius; then
    echo -e "${RED}✗ Ports are in use by another process${NC}"
else
    echo -e "${GREEN}✓ Ports are available${NC}"
fi
echo ""

# Step 6: Check permissions
echo "Step 6: Checking file permissions..."
if [ -d "$FREERADIUS_DIR" ]; then
    ls -la "$FREERADIUS_DIR" | head -10
    echo ""
    if [ -d "$FREERADIUS_DIR/mods-enabled" ]; then
        echo "Enabled modules:"
        ls -la "$FREERADIUS_DIR/mods-enabled" | head -10
    fi
else
    echo -e "${RED}✗ Config directory not accessible${NC}"
fi
echo ""

# Step 7: Test in debug mode
echo "Step 7: Attempting to start in debug mode (5 seconds)..."
echo -e "${YELLOW}Starting FreeRADIUS in debug mode...${NC}"
timeout 5 sudo $RADIUS_CMD -X 2>&1 | head -50 || true
echo ""

echo "=================================="
echo "Diagnostic Complete"
echo "=================================="
