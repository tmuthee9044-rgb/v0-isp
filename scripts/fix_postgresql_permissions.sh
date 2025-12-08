#!/bin/bash

# Script to fix PostgreSQL permissions for full CRUD operations
# Run this script if you're experiencing "must be owner of table" errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Database configuration
DB_NAME="${DB_NAME:-isp_system}"
DB_USER="${DB_USER:-isp_admin}"

print_info "Fixing PostgreSQL permissions for database: $DB_NAME, user: $DB_USER"

# Step 1: Grant SUPERUSER privileges
print_info "Step 1: Granting SUPERUSER privileges to $DB_USER..."
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH SUPERUSER CREATEDB CREATEROLE;" 2>/dev/null
print_success "SUPERUSER privileges granted"

# Step 2: Transfer database ownership
print_info "Step 2: Transferring database ownership..."
sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true
print_success "Database ownership transferred"

# Step 3: Grant all schema privileges
print_info "Step 3: Granting schema privileges..."
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
print_success "Schema privileges granted"

# Step 4: Transfer ownership of all objects
print_info "Step 4: Transferring ownership of all database objects..."
sudo -u postgres psql -d "$DB_NAME" <<SQLEOF
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Transfer ownership of all tables
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${DB_USER}';
    END LOOP;
    
    -- Transfer ownership of all sequences
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO ${DB_USER}';
    END LOOP;
    
    -- Transfer ownership of all views
    FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.viewname) || ' OWNER TO ${DB_USER}';
    END LOOP;
    
    -- Transfer ownership of all functions
    FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
             FROM pg_proc p
             JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public'
    LOOP
        EXECUTE 'ALTER FUNCTION public.' || quote_ident(r.proname) || '(' || r.args || ') OWNER TO ${DB_USER}';
    END LOOP;
END\$\$;
SQLEOF
print_success "Object ownership transferred"

# Step 5: Set default privileges
print_info "Step 5: Setting default privileges..."
sudo -u postgres psql -d "$DB_NAME" <<SQLEOF
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO ${DB_USER};
SQLEOF
print_success "Default privileges set"

# Step 6: Verify permissions
print_info "Step 6: Verifying permissions..."
RESULT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN tableowner = '${DB_USER}' THEN 1 END) as owned_tables
FROM pg_tables 
WHERE schemaname = 'public';
")

echo "$RESULT" | while read total owned; do
    if [ -n "$total" ] && [ -n "$owned" ]; then
        print_info "Total tables: $total, Owned by $DB_USER: $owned"
        if [ "$total" = "$owned" ]; then
            print_success "All tables are owned by $DB_USER"
        else
            print_error "Some tables are not owned by $DB_USER"
        fi
    fi
done

print_success "PostgreSQL permissions fixed successfully!"
print_info "The user $DB_USER now has full CRUD operations access."
