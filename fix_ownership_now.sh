#!/bin/bash
# One-command fix for "must be owner of table" errors
# This script transfers ownership and then runs the schema fix

set -e

echo "=========================================="
echo "  ISP System - Ownership & Schema Fix"
echo "=========================================="
echo ""

# Step 1: Fix permissions and transfer ownership
echo "Step 1: Transferring table ownership to isp_admin..."
bash scripts/fix_postgresql_permissions.sh

echo ""
echo "Step 2: Adding missing columns to database..."
echo "Waiting 2 seconds for permissions to take effect..."
sleep 2

# Step 2: Run the schema fix via API
echo "Executing schema synchronization..."
curl -X POST http://localhost:3000/api/admin/execute-schema-fix

echo ""
echo "=========================================="
echo "  ✅ Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Refresh your browser at /settings"
echo "2. The 'Missing Items' errors should now be resolved"
echo "3. All CRUD operations should work properly"
