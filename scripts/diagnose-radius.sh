#!/bin/bash

echo "========================================="
echo "  RADIUS CONNECTIVITY DIAGNOSTIC TOOL"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if FreeRADIUS is running
echo "1. Checking FreeRADIUS service status..."
if systemctl is-active --quiet freeradius; then
    echo -e "${GREEN}✓ FreeRADIUS service is running${NC}"
else
    echo -e "${RED}✗ FreeRADIUS service is NOT running${NC}"
    echo "   Run: sudo systemctl start freeradius"
    exit 1
fi
echo ""

# 2. Check if FreeRADIUS is listening on ports
echo "2. Checking if FreeRADIUS is listening on ports 1812 and 1813..."
if sudo netstat -uln | grep -q ":1812"; then
    echo -e "${GREEN}✓ FreeRADIUS is listening on port 1812 (authentication)${NC}"
    sudo netstat -uln | grep ":1812"
else
    echo -e "${RED}✗ FreeRADIUS is NOT listening on port 1812${NC}"
fi

if sudo netstat -uln | grep -q ":1813"; then
    echo -e "${GREEN}✓ FreeRADIUS is listening on port 1813 (accounting)${NC}"
    sudo netstat -uln | grep ":1813"
else
    echo -e "${RED}✗ FreeRADIUS is NOT listening on port 1813${NC}"
fi
echo ""

# 3. Check database connectivity
echo "3. Checking database connectivity..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    exit 1
fi
echo ""

# 4. Check if users exist in radcheck table
echo "4. Checking for RADIUS users in radcheck table..."
USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM radcheck WHERE Attribute = 'Cleartext-Password';")
if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $USER_COUNT user(s) in radcheck table${NC}"
    echo "   Sample users:"
    psql "$DATABASE_URL" -c "SELECT UserName, Attribute, Value FROM radcheck WHERE Attribute = 'Cleartext-Password' LIMIT 5;"
else
    echo -e "${RED}✗ No users found in radcheck table${NC}"
    echo -e "${YELLOW}   Users must be added to radcheck for authentication to work${NC}"
fi
echo ""

# 5. Check if speed limits exist in radreply table
echo "5. Checking for speed limits in radreply table..."
REPLY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM radreply WHERE Attribute = 'Mikrotik-Rate-Limit';")
if [ "$REPLY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $REPLY_COUNT speed limit(s) in radreply table${NC}"
    echo "   Sample speed limits:"
    psql "$DATABASE_URL" -c "SELECT UserName, Attribute, Value FROM radreply WHERE Attribute = 'Mikrotik-Rate-Limit' LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No speed limits found in radreply table${NC}"
fi
echo ""

# 6. Check if routers are registered in nas table
echo "6. Checking for registered routers in nas table..."
ROUTER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM nas;")
if [ "$ROUTER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $ROUTER_COUNT router(s) in nas table${NC}"
    echo "   Registered routers:"
    psql "$DATABASE_URL" -c "SELECT nasname, shortname, secret FROM nas;"
else
    echo -e "${RED}✗ No routers found in nas table${NC}"
    echo "   Routers must be added to nas table with the correct shared secret"
fi
echo ""

# 7. Test RADIUS authentication with radtest
echo "7. Testing RADIUS authentication..."
if command -v radtest > /dev/null 2>&1; then
    # Get first user from radcheck
    TEST_USER=$(psql "$DATABASE_URL" -t -c "SELECT UserName FROM radcheck WHERE Attribute = 'Cleartext-Password' LIMIT 1;" | xargs)
    TEST_PASS=$(psql "$DATABASE_URL" -t -c "SELECT Value FROM radcheck WHERE UserName = '$TEST_USER' AND Attribute = 'Cleartext-Password' LIMIT 1;" | xargs)
    
    if [ -n "$TEST_USER" ]; then
        echo "   Testing with user: $TEST_USER"
        RADTEST_OUTPUT=$(radtest "$TEST_USER" "$TEST_PASS" localhost 0 testing123 2>&1)
        if echo "$RADTEST_OUTPUT" | grep -q "Access-Accept"; then
            echo -e "${GREEN}✓ RADIUS authentication successful!${NC}"
        elif echo "$RADTEST_OUTPUT" | grep -q "Access-Reject"; then
            echo -e "${YELLOW}⚠ RADIUS server responded but rejected the credentials${NC}"
            echo "   This means FreeRADIUS is working but the password might be wrong"
        else
            echo -e "${RED}✗ RADIUS authentication failed or timed out${NC}"
            echo "$RADTEST_OUTPUT"
        fi
    else
        echo -e "${YELLOW}⚠ No test user available in radcheck table${NC}"
    fi
else
    echo -e "${YELLOW}⚠ radtest command not found. Install freeradius-utils${NC}"
fi
echo ""

# 8. Check recent authentication attempts
echo "8. Checking recent authentication attempts (radpostauth)..."
AUTH_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM radpostauth WHERE authdate > NOW() - INTERVAL '1 hour';")
if [ "$AUTH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $AUTH_COUNT authentication attempt(s) in the last hour${NC}"
    echo "   Recent attempts:"
    psql "$DATABASE_URL" -c "SELECT username, reply, authdate FROM radpostauth ORDER BY authdate DESC LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No authentication attempts in the last hour${NC}"
    echo -e "${YELLOW}   This means the router is not sending requests to RADIUS${NC}"
fi
echo ""

# 9. Check active sessions
echo "9. Checking active RADIUS sessions..."
SESSION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM radacct WHERE AcctStopTime IS NULL;")
if [ "$SESSION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $SESSION_COUNT active session(s)${NC}"
    echo "   Active sessions:"
    psql "$DATABASE_URL" -c "SELECT UserName, FramedIPAddress, AcctStartTime FROM radacct WHERE AcctStopTime IS NULL LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No active RADIUS sessions${NC}"
fi
echo ""

# 10. Provide MikroTik configuration instructions
echo "========================================="
echo "  MIKROTIK ROUTER CONFIGURATION"
echo "========================================="
echo ""
echo "If no authentication attempts are reaching FreeRADIUS, configure your MikroTik router:"
echo ""
echo "1. Get your FreeRADIUS server IP address:"
echo "   hostname -I | awk '{print \$1}'"
echo ""
echo "2. Add RADIUS server to MikroTik (via terminal or WinBox):"
echo "   /radius add service=ppp,login address=<RADIUS_SERVER_IP> secret=testing123"
echo ""
echo "3. Enable RADIUS for PPP authentication:"
echo "   /ppp aaa set use-radius=yes"
echo ""
echo "4. For Hotspot, also enable RADIUS:"
echo "   /ip hotspot profile set default use-radius=yes"
echo ""
echo "5. Verify RADIUS is configured:"
echo "   /radius print"
echo "   /ppp aaa print"
echo ""
echo "========================================="
