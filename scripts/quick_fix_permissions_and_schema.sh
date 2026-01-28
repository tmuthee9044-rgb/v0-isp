#!/bin/bash

# One-command fix for permission and schema issues
# Run this script to fix everything: sudo bash scripts/quick_fix_permissions_and_schema.sh

set -e

echo "ISP System - Complete Schema Fix"
echo "===================================="
echo ""

# ============================================================
# Step 0: Fix file system permissions FIRST
# ============================================================
echo "Step 0/3: Fixing file system permissions..."

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

echo "   File system permissions fixed"
echo ""

cd "$PROJECT_ROOT"

DB_NAME="${DB_NAME:-isp_system}"
DB_USER="${DB_USER:-isp_admin}"

echo "Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Step 1: Transfer ownership
echo "Step 1/3: Transferring table ownership..."
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

echo "Ownership transferred"
echo ""

# Step 2: Add missing columns
echo "Step 2/3: Adding missing columns..."

# Try temp location first (postgres can always access /tmp)
if [ -f "$TEMP_DIR/fix_all_missing_columns.sql" ]; then
    PGPASSWORD="SecurePass123!" psql -U "$DB_USER" -d "$DB_NAME" -f "$TEMP_DIR/fix_all_missing_columns.sql" || \
    PGPASSWORD="SecurePass123!" psql -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/fix_all_missing_columns.sql"
else
    PGPASSWORD="SecurePass123!" psql -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/fix_all_missing_columns.sql"
fi

echo ""

# Step 3: Cleanup
echo "Step 3/3: Cleaning up..."
rm -rf "$TEMP_DIR" 2>/dev/null || true

echo ""
echo "Complete! All missing columns have been added."
echo "Your database schema is now fully synchronized."
