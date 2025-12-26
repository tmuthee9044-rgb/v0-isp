#!/bin/bash

# Script to create all RADIUS infrastructure tables
# This script must be run after PostgreSQL is set up

set -e

echo "[INFO] Creating RADIUS infrastructure tables..."

# Get database connection details
DB_URL="${DATABASE_URL:-${POSTGRES_URL}}"

if [ -z "$DB_URL" ]; then
    echo "[ERROR] No database URL found. Set DATABASE_URL or POSTGRES_URL environment variable."
    exit 1
fi

# Run the RADIUS infrastructure SQL script
psql "$DB_URL" -f "$(dirname "$0")/create_radius_infrastructure.sql"

if [ $? -eq 0 ]; then
    echo "[OK] RADIUS infrastructure tables created successfully"
    echo "[INFO] Tables created:"
    echo "  - radius_nas (Network Access Servers)"
    echo "  - radius_users (RADIUS user accounts)"
    echo "  - radius_sessions_active (Active sessions)"
    echo "  - radius_sessions_archive (Historical sessions)"
    echo "  - radius_accounting (Detailed accounting)"
else
    echo "[ERROR] Failed to create RADIUS tables"
    exit 1
fi

echo "[INFO] Creating bandwidth_usage table..."
psql "$DB_URL" -f "$(dirname "$0")/create_bandwidth_usage_table.sql"

if [ $? -eq 0 ]; then
    echo "[OK] bandwidth_usage table created successfully"
else
    echo "[ERROR] Failed to create bandwidth_usage table"
    exit 1
fi

echo ""
echo "============================================"
echo "RADIUS Infrastructure Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Ensure FreeRADIUS is installed and configured"
echo "2. Configure FreeRADIUS to use SQL authentication"
echo "3. Add routers to the system (they will auto-sync to radius_nas)"
echo "4. Activate customer services to provision RADIUS users"
echo ""
