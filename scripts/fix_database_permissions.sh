#!/usr/bin/env bash

# ISP Management System - Fix Database Permissions
# This script grants proper ownership and permissions to allow schema modifications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Extract database details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set"
    exit 1
fi

DB_USER=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $4}')
DB_NAME=$(echo "$DATABASE_URL" | awk -F'[/:@?]' '{print $8}')

print_info "Fixing permissions for database: $DB_NAME"
print_info "User: $DB_USER"

# Run as postgres superuser to fix permissions
print_info "Transferring table ownership to $DB_USER..."

sudo -u postgres psql -d "$DB_NAME" << EOF
-- Transfer ownership of all tables to isp_admin
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO $DB_USER';
        RAISE NOTICE 'Changed owner of table % to $DB_USER', r.tablename;
    END LOOP;
END\$\$;

-- Transfer ownership of all sequences
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO $DB_USER';
        RAISE NOTICE 'Changed owner of sequence % to $DB_USER', r.sequencename;
    END LOOP;
END\$\$;

-- Grant all privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

EOF

print_info "✓ Permissions fixed successfully"
print_info "Now you can run the schema fix script"
EOF

chmod +x scripts/fix_database_permissions.sh
