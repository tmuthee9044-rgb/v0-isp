# FreeRADIUS Startup Failure - Troubleshooting Guide

## Error Encountered
\`\`\`
Job for freeradius.service failed because the control process exited with error code.
\`\`\`

## Quick Fix Steps

### Step 1: Run Diagnostic Script
First, let's understand what's causing the failure:

\`\`\`bash
chmod +x scripts/diagnose-freeradius.sh
sudo ./scripts/diagnose-freeradius.sh
\`\`\`

This will show you:
- Configuration syntax errors
- Service status
- Recent error logs
- Port conflicts
- Permission issues

### Step 2: Check Detailed Logs
View the actual error messages:

\`\`\`bash
sudo journalctl -xeu freeradius.service -n 50
\`\`\`

Look for common errors like:
- **Configuration file errors** - syntax issues in config files
- **Port already in use** - another process using ports 1812/1813
- **Permission denied** - file permission issues
- **Database connection errors** - PostgreSQL connection issues
- **Module loading errors** - missing or misconfigured modules

### Step 3: Apply Common Fixes

#### Fix #1: Configuration Syntax Test
Test if the configuration is valid:

\`\`\`bash
sudo freeradius -CX
# OR
sudo radiusd -CX
\`\`\`

If there are syntax errors, they'll be displayed here.

#### Fix #2: Apply Minimal Configuration
If configuration is corrupted, reset to minimal working config:

\`\`\`bash
chmod +x scripts/fix-freeradius-minimal.sh
sudo ./scripts/fix-freeradius-minimal.sh
\`\`\`

This creates a clean minimal configuration that should start successfully.

#### Fix #3: Fix Permissions
If permission errors are shown:

\`\`\`bash
chmod +x scripts/fix-freeradius-permissions.sh
sudo ./scripts/fix-freeradius-permissions.sh
\`\`\`

#### Fix #4: Check Port Conflicts
See if another process is using RADIUS ports:

\`\`\`bash
sudo netstat -ulnp | grep -E ':(1812|1813)'
# OR
sudo ss -ulnp | grep -E ':(1812|1813)'
\`\`\`

If another process is using these ports, you'll need to stop it:

\`\`\`bash
# Find the process ID (PID) from the netstat output
sudo kill <PID>
\`\`\`

#### Fix #5: Check Database Connection
If the error mentions database issues, verify PostgreSQL is running:

\`\`\`bash
sudo systemctl status postgresql
\`\`\`

And test database connectivity:

\`\`\`bash
psql $DATABASE_URL -c "SELECT 1;"
\`\`\`

### Step 4: Manual Start in Debug Mode
Start FreeRADIUS in debug mode to see detailed error messages:

\`\`\`bash
sudo systemctl stop freeradius
sudo freeradius -X
# OR
sudo radiusd -X
\`\`\`

Press `Ctrl+C` to stop it once you've identified the issue.

### Step 5: Restart Service
After fixing issues, restart the service:

\`\`\`bash
sudo systemctl restart freeradius
sudo systemctl status freeradius
\`\`\`

Verify it's listening on the correct ports:

\`\`\`bash
sudo netstat -ulnp | grep -E ':(1812|1813)'
\`\`\`

## Common Issues and Solutions

### Issue 1: Module Loading Errors
**Error:** `Failed to load module rlm_sql_postgresql`

**Solution:**
\`\`\`bash
# Install PostgreSQL module
sudo apt install -y freeradius-postgresql

# OR rebuild module links
cd /etc/freeradius/3.0/mods-enabled
sudo rm sql
sudo ln -s ../mods-available/sql sql

sudo systemctl restart freeradius
\`\`\`

### Issue 2: Configuration File Syntax Errors
**Error:** `Errors reading or parsing /etc/freeradius/3.0/...`

**Solution:**
\`\`\`bash
# Restore from backup
sudo cp /etc/freeradius/3.0.backup.<timestamp>/sites-available/default /etc/freeradius/3.0/sites-available/default

# OR apply minimal config
sudo ./scripts/fix-freeradius-minimal.sh
\`\`\`

### Issue 3: Listen Address Binding Error
**Error:** `Failed binding to authentication address * port 1812`

**Solutions:**
\`\`\`bash
# Check what's using the port
sudo netstat -ulnp | grep 1812

# Update the listen address in radiusd.conf or default site
# Change from 0.0.0.0 to 127.0.0.1 or your specific IP

# OR kill the conflicting process
sudo kill <PID>
\`\`\`

### Issue 4: SQL Module Configuration Error
**Error:** `rlm_sql (sql): Failed to connect to database`

**Solution:**
\`\`\`bash
# Check PostgreSQL is running
sudo systemctl start postgresql

# Verify database credentials in SQL module config
sudo nano /etc/freeradius/3.0/mods-available/sql

# Test database connection manually
psql -h localhost -U <db_user> -d <db_name>
\`\`\`

### Issue 5: Certificate/TLS Errors
**Error:** `Failed to initialize TLS context`

**Solution:**
\`\`\`bash
# Disable inner-tunnel temporarily
sudo rm /etc/freeradius/3.0/sites-enabled/inner-tunnel

# OR regenerate certificates
cd /etc/freeradius/3.0/certs
sudo make destroycerts
sudo make
\`\`\`

### Issue 6: User/Group Permission Errors
**Error:** `Failed to set group to freerad`

**Solution:**
\`\`\`bash
# Ensure freerad user/group exists
sudo groupadd -f freerad
sudo useradd -g freerad -s /bin/false freerad 2>/dev/null || true

# Fix ownership
sudo chown -R freerad:freerad /etc/freeradius/3.0
sudo chmod 640 /etc/freeradius/3.0/clients.conf
\`\`\`

## Post-Fix Verification

After fixing the issue, verify everything is working:

### 1. Service Status
\`\`\`bash
sudo systemctl status freeradius
# Should show "active (running)"
\`\`\`

### 2. Port Listening
\`\`\`bash
sudo netstat -ulnp | grep -E ':(1812|1813)'
# Should show freeradius listening on both ports
\`\`\`

### 3. Configuration Test
\`\`\`bash
sudo freeradius -CX
# Should show "Configuration appears to be OK"
\`\`\`

### 4. Test Authentication (from the ISP app)
1. Go to `/settings/servers` in the web interface
2. Click "Test Connection" under FreeRADIUS configuration
3. Should return success status

### 5. Check Logs for Clean Startup
\`\`\`bash
sudo journalctl -xeu freeradius.service -n 20
# Should show successful startup messages
\`\`\`

## Enable Auto-Restart on Failure

To make FreeRADIUS automatically restart if it crashes:

\`\`\`bash
sudo mkdir -p /etc/systemd/system/freeradius.service.d
sudo tee /etc/systemd/system/freeradius.service.d/restart.conf > /dev/null <<EOF
[Service]
Restart=always
RestartSec=10
EOF

sudo systemctl daemon-reload
sudo systemctl restart freeradius
\`\`\`

## Getting More Help

If issues persist:

1. **Check full logs:**
   \`\`\`bash
   sudo journalctl -xeu freeradius.service --no-pager
   \`\`\`

2. **Save debug output to file:**
   \`\`\`bash
   sudo freeradius -X > /tmp/freeradius-debug.log 2>&1
   cat /tmp/freeradius-debug.log
   \`\`\`

3. **Check FreeRADIUS version:**
   \`\`\`bash
   freeradius -v
   \`\`\`

4. **Verify all required packages are installed:**
   \`\`\`bash
   dpkg -l | grep freeradius
   \`\`\`

## Quick Reference: All Diagnostic Commands

\`\`\`bash
# Service status
sudo systemctl status freeradius

# Recent logs
sudo journalctl -xeu freeradius.service -n 50

# Configuration test
sudo freeradius -CX

# Debug mode
sudo freeradius -X

# Port check
sudo netstat -ulnp | grep -E ':(1812|1813)'

# Permission check
ls -la /etc/freeradius/3.0/

# Database test
psql $DATABASE_URL -c "SELECT * FROM radius_users LIMIT 1;"
\`\`\`
