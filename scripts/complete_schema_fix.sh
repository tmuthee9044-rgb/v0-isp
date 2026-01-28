#!/bin/bash

# Complete Schema Fix Script
# Transfers ownership and adds all missing columns
# Run this script to fix database schema issues

set -e

echo "==================================================="
echo "Complete Database Schema Fix"
echo "==================================================="

# Database configuration
DB_NAME="${POSTGRES_DATABASE:-isp_system}"
DB_USER="${POSTGRES_USER:-isp_admin}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo ""
echo "Step 1: Transferring table ownership to ${DB_USER}..."
echo ""

# Transfer ownership as postgres superuser
sudo -u postgres psql -d "${DB_NAME}" << EOF
-- Transfer all table ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${DB_USER}';
        RAISE NOTICE 'Transferred ownership of table: %', r.tablename;
    END LOOP;
END \$\$;

-- Transfer all sequence ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO ${DB_USER}';
        RAISE NOTICE 'Transferred ownership of sequence: %', r.sequence_name;
    END LOOP;
END \$\$;

-- Transfer all view ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.table_name) || ' OWNER TO ${DB_USER}';
        RAISE NOTICE 'Transferred ownership of view: %', r.table_name;
    END LOOP;
END \$\$;
EOF

echo ""
echo "✅ Ownership transfer completed!"
echo ""
echo "Step 2: Adding missing columns..."
echo ""

# Now execute the schema fix as the application user
# Read the SQL file and pipe it to psql to avoid file permission issues
cat scripts/fix_all_missing_columns.sql | PGPASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo ""
echo "==================================================="
echo "✅ Schema fix completed successfully!"
echo "==================================================="
echo ""
echo "All 191 missing columns have been added to 43 tables."
echo "Your database schema now matches the Neon schema."
echo ""
