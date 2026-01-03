#!/bin/bash

echo "=========================================="
echo "  Applying Missing Database Columns"
echo "=========================================="

# Copy the SQL file to /tmp where postgres can read it
cp scripts/1000_fix_all_missing_columns.sql /tmp/fix_columns.sql
chmod 644 /tmp/fix_columns.sql

# Apply the fix
echo "[INFO] Applying column fixes..."
cd /tmp
sudo -u postgres psql -d isp_management -f /tmp/fix_columns.sql 2>&1

# Check results
echo ""
echo "[INFO] Verifying customers.name column..."
RESULT=$(sudo -u postgres psql -d isp_management -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name='name';" 2>/dev/null | xargs)

if [ "$RESULT" = "name" ]; then
    echo "[OK] customers.name column exists"
else
    echo "[ERROR] customers.name column still missing"
fi

# Check company_profiles.name
echo "[INFO] Verifying company_profiles.name column..."
RESULT=$(sudo -u postgres psql -d isp_management -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='name';" 2>/dev/null | xargs)

if [ "$RESULT" = "name" ]; then
    echo "[OK] company_profiles.name column exists"
else
    echo "[ERROR] company_profiles.name column still missing"
fi

# Check locations sequence
echo "[INFO] Verifying locations ID sequence..."
RESULT=$(sudo -u postgres psql -d isp_management -t -c "SELECT column_default FROM information_schema.columns WHERE table_name='locations' AND column_name='id';" 2>/dev/null)

if echo "$RESULT" | grep -q "nextval"; then
    echo "[OK] locations.id has auto-increment sequence"
else
    echo "[ERROR] locations.id missing auto-increment"
fi

# Cleanup
rm /tmp/fix_columns.sql

echo ""
echo "[INFO] Column fix application complete!"
echo "=========================================="
