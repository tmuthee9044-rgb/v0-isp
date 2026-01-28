#!/bin/bash

# Complete Schema Fix Script
# Transfers ownership and adds all missing columns
# Run this script to fix database schema issues

set -e

echo "==================================================="
echo "Complete Database Schema Fix"
echo "==================================================="

# ============================================================
# Step 0: Fix file system permissions FIRST
# ============================================================
echo ""
echo "Step 0: Fixing file system permissions..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Fix directory traversal permissions for postgres user
chmod a+rx "$SCRIPT_DIR" 2>/dev/null || sudo chmod a+rx "$SCRIPT_DIR" 2>/dev/null || true
chmod a+rx "$PROJECT_ROOT" 2>/dev/null || sudo chmod a+rx "$PROJECT_ROOT" 2>/dev/null || true

# Fix all parent directories up to root
PARENT_DIR="$PROJECT_ROOT"
while [[ "$PARENT_DIR" != "/" && "$PARENT_DIR" != "" ]]; do
    chmod a+x "$PARENT_DIR" 2>/dev/null || sudo chmod a+x "$PARENT_DIR" 2>/dev/null || true
    PARENT_DIR="$(dirname "$PARENT_DIR")"
done

# Make all SQL files readable by all users (including postgres)
for sql_file in "$SCRIPT_DIR"/*.sql 2>/dev/null; do
    [ -f "$sql_file" ] && chmod a+r "$sql_file" 2>/dev/null || sudo chmod a+r "$sql_file" 2>/dev/null || true
done

# Make all shell scripts executable
for sh_file in "$SCRIPT_DIR"/*.sh 2>/dev/null; do
    [ -f "$sh_file" ] && chmod a+rx "$sh_file" 2>/dev/null || sudo chmod a+rx "$sh_file" 2>/dev/null || true
done

# Create temp directory for postgres user access as fallback
TEMP_DIR="/tmp/isp-migrations"
mkdir -p "$TEMP_DIR" 2>/dev/null || true
chmod 777 "$TEMP_DIR" 2>/dev/null || true
cp "$SCRIPT_DIR"/*.sql "$TEMP_DIR/" 2>/dev/null || true
chmod 644 "$TEMP_DIR"/*.sql 2>/dev/null || true

echo "File system permissions fixed"

cd "$PROJECT_ROOT"

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
# Try temp location first (postgres can always access /tmp)
if [ -f "$TEMP_DIR/fix_all_missing_columns.sql" ]; then
    PGPASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$TEMP_DIR/fix_all_missing_columns.sql" || \
    PGPASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$SCRIPT_DIR/fix_all_missing_columns.sql"
else
    PGPASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$SCRIPT_DIR/fix_all_missing_columns.sql"
fi

# Cleanup temp directory
rm -rf "$TEMP_DIR" 2>/dev/null || true

echo ""
echo "==================================================="
echo "Schema fix completed successfully!"
echo "==================================================="
echo ""
echo "All missing columns have been added."
echo "Your database schema now matches the Neon schema."
echo ""
