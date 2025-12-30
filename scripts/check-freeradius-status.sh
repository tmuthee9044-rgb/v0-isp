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

export PGPASSWORD="${POSTGRES_PASSWORD}"
psql -h "${PGHOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DATABASE}" -c "SELECT COUNT(*) as router_count FROM nas;" 2>&1 | head -n 10

echo ""
echo "=== Registered NAS Clients ==="
psql -h "${PGHOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DATABASE}" -c "SELECT nasname, shortname, type FROM nas;" 2>&1

echo ""
echo "=== Port Responsiveness Test ==="
if command -v radtest &> /dev/null; then
  echo "Testing RADIUS authentication..."
  timeout 3 radtest test test 127.0.0.1 0 testing123 2>&1 | grep -E "Sent|Received|Access-Reject|Access-Accept" || echo "RADIUS test sent"
else
  sudo ss -ulnp | grep 1812 && echo "RADIUS port 1812 is listening" || echo "RADIUS port 1812 is not listening"
fi
