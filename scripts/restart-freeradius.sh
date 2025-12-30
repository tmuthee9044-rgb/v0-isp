#!/bin/bash
# Restart FreeRADIUS service
echo "Stopping FreeRADIUS..."
sudo systemctl stop freeradius

echo "Starting FreeRADIUS..."
sudo systemctl start freeradius

echo "Checking status..."
sudo systemctl status freeradius --no-pager

echo ""
echo "FreeRADIUS restarted successfully!"
echo "Check logs with: sudo journalctl -u freeradius -n 50"
