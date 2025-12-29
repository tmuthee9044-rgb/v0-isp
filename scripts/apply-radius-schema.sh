#!/bin/bash

echo "=========================================="
echo "Applying Standard FreeRADIUS Schema"
echo "=========================================="

# Database connection details
DB_NAME="isp_system"
DB_USER="isp_admin"
DB_PASS="SecurePass123!"

# Apply the schema
echo "[INFO] Creating standard RADIUS tables..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -f scripts/migrate_to_standard_radius_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ [SUCCESS] Standard RADIUS schema created successfully"
    
    # Verify tables were created
    echo ""
    echo "[INFO] Verifying tables..."
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -c "\dt nas radcheck radreply radacct"
    
    echo ""
    echo "[INFO] Checking migrated data..."
    echo "NAS entries:"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -c "SELECT nasname, shortname, type FROM nas;"
    
    echo ""
    echo "RADIUS users:"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -c "SELECT username, attribute FROM radcheck LIMIT 5;"
    
    echo ""
    echo "=========================================="
    echo "✅ Migration complete! Now restart FreeRADIUS:"
    echo "   sudo systemctl restart freeradius"
    echo "   sudo systemctl status freeradius"
    echo "=========================================="
else
    echo "❌ [ERROR] Failed to create schema"
    exit 1
fi
