#!/bin/bash
# Check FreeRADIUS status and connectivity

echo "=== FreeRADIUS Service Status ==="
sudo systemctl status freeradius --no-pager

echo ""
echo "=== Listening Ports ==="
sudo netstat -ulnp | grep -E "1812|1813" || echo "No RADIUS ports found"

echo ""
echo "=== Recent Logs ==="
sudo journalctl -u freeradius -n 20 --no-pager

echo ""
echo "=== Database Connection Test ==="
sudo -u freerad psql -h localhost -U isp_admin -d isp_system -c "SELECT COUNT(*) as router_count FROM nas;" 2>&1 | head -n 5

echo ""
echo "=== Registered NAS Clients ==="
sudo -u freerad psql -h localhost -U isp_admin -d isp_system -c "SELECT nasname, shortname, type FROM nas;" 2>&1
