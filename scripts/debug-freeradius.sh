#!/bin/bash
# Run FreeRADIUS in debug mode
echo "Stopping FreeRADIUS service..."
sudo systemctl stop freeradius

echo ""
echo "Starting FreeRADIUS in debug mode..."
echo "Press Ctrl+C to stop"
echo "-----------------------------------"
sudo freeradius -X
