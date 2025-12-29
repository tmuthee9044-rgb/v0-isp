#!/bin/bash

# Setup cron job for FreeRADIUS scheduled reboots
# This script creates a systemd timer and service for scheduled reboots

echo "Setting up FreeRADIUS scheduled reboot service..."

# Create the reboot check script
cat > /usr/local/bin/check-radius-reboot.sh << 'EOF'
#!/bin/bash

# Check if scheduled reboot is due
RESPONSE=$(curl -s http://localhost:3000/api/server-settings/scheduled-reboot)
ENABLED=$(echo $RESPONSE | jq -r '.data.enabled // false')
NEXT_REBOOT=$(echo $RESPONSE | jq -r '.data.nextReboot // ""')

if [ "$ENABLED" = "true" ] && [ -n "$NEXT_REBOOT" ]; then
    CURRENT_TIME=$(date +%s)
    REBOOT_TIME=$(date -d "$NEXT_REBOOT" +%s 2>/dev/null)
    
    if [ $? -eq 0 ] && [ $CURRENT_TIME -ge $REBOOT_TIME ]; then
        echo "Scheduled reboot time reached. Executing reboot..."
        curl -s -X POST http://localhost:3000/api/server-settings/scheduled-reboot \
            -H "Content-Type: application/json" \
            -d '{"action":"execute"}'
    fi
fi
EOF

chmod +x /usr/local/bin/check-radius-reboot.sh

# Create systemd service
cat > /etc/systemd/system/radius-reboot-check.service << 'EOF'
[Unit]
Description=Check FreeRADIUS Scheduled Reboot
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-radius-reboot.sh
User=root
EOF

# Create systemd timer (runs every hour)
cat > /etc/systemd/system/radius-reboot-check.timer << 'EOF'
[Unit]
Description=Check FreeRADIUS Scheduled Reboot Timer
Requires=radius-reboot-check.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload systemd and enable timer
systemctl daemon-reload
systemctl enable radius-reboot-check.timer
systemctl start radius-reboot-check.timer

echo "✅ FreeRADIUS scheduled reboot service configured successfully"
echo "   Timer status: systemctl status radius-reboot-check.timer"
