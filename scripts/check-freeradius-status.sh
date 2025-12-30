#!/bin/bash
# Check FreeRADIUS status and connectivity

echo "=== FreeRADIUS Service Status ==="
sudo systemctl status freeradius --no-pager

echo ""
echo "=== Listening Ports ==="
sudo ss -ulnp | grep -E "1812|1813" || echo "No RADIUS ports found"

echo ""
echo "=== Recent Logs ==="
sudo journalctl -u freeradius -n 20 --no-pager

echo ""
echo "=== Database Connection Test ==="
if [ -f .env.local ]; then
  source .env.local
fi

if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "SELECT COUNT(*) as router_count FROM nas;" 2>&1 | head -n 10
else
  echo "DATABASE_URL not found in environment"
fi

echo ""
echo "=== Registered NAS Clients ==="
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "SELECT nasname, shortname, type FROM nas;" 2>&1
else
  echo "DATABASE_URL not found in environment"
fi

echo ""
echo "=== Port Responsiveness Test ==="
if command -v radtest &> /dev/null; then
  echo "Testing RADIUS authentication with test user..."
  RADIUS_TEST_OUTPUT=$(timeout 5 radtest testing password 127.0.0.1 0 testing123 2>&1)
  RADIUS_EXIT_CODE=$?
  
  echo "$RADIUS_TEST_OUTPUT"
  
  if echo "$RADIUS_TEST_OUTPUT" | grep -q "Access-Accept"; then
    echo "[✓] RADIUS authentication test SUCCESSFUL - Server is responding correctly"
  elif echo "$RADIUS_TEST_OUTPUT" | grep -q "Access-Reject"; then
    echo "[✓] RADIUS server responding (Access-Reject received - expected for test user)"
  elif echo "$RADIUS_TEST_OUTPUT" | grep -q "no response"; then
    echo "[✗] RADIUS test FAILED - No response from server"
  elif [ $RADIUS_EXIT_CODE -eq 124 ]; then
    echo "[✗] RADIUS test TIMED OUT - Server may not be responding"
  else
    echo "[?] RADIUS test result unclear - Check output above"
  fi
else
  echo "radtest command not found, checking port status only..."
  if sudo ss -ulnp | grep -q 1812; then
    echo "[✓] RADIUS port 1812 is listening on UDP"
  else
    echo "[✗] RADIUS port 1812 is NOT listening"
  fi
fi
