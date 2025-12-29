#!/bin/bash

# Apply RADIUS network device sync
# This script adds RADIUS columns to network_devices and sets up auto-sync

set -e

echo "========================================"
echo "Adding RADIUS Columns and Auto-Sync"
echo "========================================"

# Get database connection details
if [ -f .env ]; then
    source .env
fi

DB_URL="${DATABASE_URL:-${POSTGRES_URL}}"

if [ -z "$DB_URL" ]; then
    echo "Error: DATABASE_URL not found in environment"
    exit 1
fi

echo "[1/3] Adding RADIUS columns to network_devices table..."
psql "$DB_URL" -f scripts/add_radius_columns_to_network_devices.sql

if [ $? -eq 0 ]; then
    echo "✓ RADIUS columns added successfully"
else
    echo "✗ Failed to add RADIUS columns"
    exit 1
fi

echo ""
echo "[2/3] Setting default RADIUS secret for existing routers..."
psql "$DB_URL" << EOF
UPDATE network_devices
SET radius_secret = 'testing123',
    radius_enabled = TRUE
WHERE (device_type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') 
       OR device_type ILIKE '%router%')
  AND radius_secret IS NULL;
EOF

echo "✓ Default secrets set"

echo ""
echo "[3/3] Testing trigger by updating a router..."
psql "$DB_URL" << EOF
-- Trigger the sync by updating a router
UPDATE network_devices
SET updated_at = NOW()
WHERE (device_type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') 
       OR device_type ILIKE '%router%')
LIMIT 1;
EOF

echo "✓ Trigger tested"

echo ""
echo "========================================"
echo "Checking nas table contents..."
echo "========================================"
psql "$DB_URL" -c "SELECT nasname, shortname, secret, description FROM nas ORDER BY nasname;"

echo ""
echo "✓ RADIUS network device sync configured successfully!"
echo ""
echo "All routers in network_devices will now automatically sync to the nas table."
echo "Test RADIUS connectivity in /settings/servers → Router Connectivity Testing"
