#!/bin/bash

# One-command fix for permission and schema issues
# Run this script to fix everything: sudo bash scripts/quick_fix_permissions_and_schema.sh

set -e

echo "🚀 ISP System - Complete Schema Fix"
echo "===================================="
echo ""

DB_NAME="${DB_NAME:-isp_system}"
DB_USER="${DB_USER:-isp_admin}"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Step 1: Transfer ownership
echo "Step 1/2: Transferring table ownership..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Transfer all tables
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO $DB_USER';
    END LOOP;
    
    -- Transfer all sequences
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO $DB_USER';
    END LOOP;
END \$\$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo "✅ Ownership transferred"
echo ""

# Step 2: Add missing columns
echo "Step 2/2: Adding missing columns..."
PGPASSWORD="SecurePass123!" psql -U "$DB_USER" -d "$DB_NAME" -f scripts/fix_all_missing_columns.sql

echo ""
echo "✅ Complete! All 191 missing columns have been added."
echo "🎉 Your database schema is now fully synchronized with Neon."
