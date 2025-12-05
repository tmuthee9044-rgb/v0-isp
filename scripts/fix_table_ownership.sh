#!/bin/bash

# Script to fix table ownership issues
# Run this script if you get "must be owner of table" errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Database configuration
DB_NAME="${DB_NAME:-isp_system}"
DB_USER="${DB_USER:-isp_admin}"

print_info "Fixing table ownership for database: $DB_NAME"
print_info "Transferring ownership to user: $DB_USER"

# Transfer ownership of all database objects
sudo -u postgres psql -d "$DB_NAME" <<EOSQL
DO \$\$
DECLARE
    r RECORD;
    obj_count INTEGER := 0;
BEGIN
    -- Transfer ownership of all tables
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${DB_USER}';
        obj_count := obj_count + 1;
    END LOOP;
    RAISE NOTICE 'Transferred ownership of % tables', obj_count;
    
    obj_count := 0;
    -- Transfer ownership of all sequences
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO ${DB_USER}';
        obj_count := obj_count + 1;
    END LOOP;
    RAISE NOTICE 'Transferred ownership of % sequences', obj_count;
    
    obj_count := 0;
    -- Transfer ownership of all views
    FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.viewname) || ' OWNER TO ${DB_USER}';
        obj_count := obj_count + 1;
    END LOOP;
    RAISE NOTICE 'Transferred ownership of % views', obj_count;
END\$\$;

-- Grant all privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};
EOSQL

if [ $? -eq 0 ]; then
    print_success "Successfully transferred ownership of all database objects to $DB_USER"
    print_info "You can now run the schema fix to add missing columns"
else
    print_error "Failed to transfer ownership"
    exit 1
fi
